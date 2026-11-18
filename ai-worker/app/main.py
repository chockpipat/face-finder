"""
main.py
FastAPI + Async Worker for Face Finder AI processing.
"""

from __future__ import annotations

import asyncio
import base64
import os
import httpx
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel

from .face_engine import engine
from .drive import download_image
from .job_store import JobStore

app = FastAPI(title="Face Finder AI Worker")
store = JobStore()


class ProcessJobRequest(BaseModel):
    jobId: str
    driveFolderId: str
    referenceImageBase64: str
    threshold: float = 0.5


@app.on_event("startup")
async def startup_event():
    print("[worker] connecting to Redis...")
    await store.connect()
    print("[worker] ready for requests")


async def process_job_task(payload: dict) -> None:
    job_id = payload["jobId"]
    folder_id = payload["driveFolderId"]
    reference_b64 = payload["referenceImageBase64"]
    threshold: float = float(payload.get("threshold", 0.5))

    print(f"[worker] starting job {job_id}")

    # ── 1. Generate reference embedding ──────────────────────────────────────
    await store.update_job(job_id, status="processing")

    ref_bytes = base64.b64decode(reference_b64)
    print(f"[worker] detecting faces in reference image for job {job_id}...")
    ref_faces = engine.get_faces(ref_bytes)
    del ref_bytes, reference_b64

    if not ref_faces:
        print(f"[worker] no face detected in reference image for job {job_id}")
        await store.update_job(
            job_id,
            status="failed",
            errorMessage="ไม่พบใบหน้าในรูปอ้างอิง กรุณาใช้อื่นที่เห็นใบหน้าชัดเจน",
        )
        return

    ref_embedding = ref_faces[0].embedding
    print(f"[worker] face detected for job {job_id}, listing Drive files...")

    # ── 2. List images from Google Drive via Next.js API ─────────────────────
    nextjs_url = os.environ.get("NEXTJS_URL", "http://web:3000")

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            res = await client.get(
                f"{nextjs_url}/api/drive/list",
                params={"folderId": folder_id},
                headers={"X-Internal-Token": os.environ.get("INTERNAL_TOKEN", "")},
            )
            if res.status_code != 200:
                err_data = res.json()
                raise Exception(err_data.get("error", f"HTTP {res.status_code}"))
            files: list[dict] = res.json().get("files", [])
    except Exception as exc:
        print(f"[worker] failed to list Drive files: {exc}")
        await store.update_job(
            job_id,
            status="failed",
            errorMessage=f"ดึงข้อมูลจาก Google Drive ล้มเหลว: {exc}",
        )
        return

    total = len(files)
    print(f"[worker] found {total} files for job {job_id}")
    await store.update_job(
        job_id,
        status="scanning",
        totalFiles=total,
    )

    if total == 0:
        await store.update_job(
            job_id,
            status="completed",
            processedFiles=0,
            matchedFiles=0,
            currentFile=None,
        )
        return

    # ── 3. Process each image ─────────────────────────────────────────────────
    matched = 0
    for i, file in enumerate(files):
        file_id = file["id"]
        file_name = file["name"]

        # Update progress (1-indexed for clear percentage)
        await store.update_job(
            job_id,
            processedFiles=i + 1,
            currentFile=file_name,
        )

        image_bytes = await download_image(file_id)
        if image_bytes is None:
            continue

        faces = engine.get_faces(image_bytes)
        del image_bytes

        for face in faces:
            similarity = engine.cosine_similarity(ref_embedding, face.embedding)

            if similarity >= threshold:
                matched += 1
                x, y, w, h = face.bbox

                await store.append_result(
                    job_id,
                    {
                        "driveFileId": file_id,
                        "fileName": file_name,
                        "driveUrl": file.get("webViewLink", ""),
                        "thumbnailUrl": file.get("thumbnailLink"),
                        "similarity": round(float(similarity), 4),
                        "matchingFaceIndex": face.index,
                        "totalFacesInImage": len(faces),
                        "boundingBox": {
                            "x": x,
                            "y": y,
                            "width": w,
                            "height": h,
                        },
                    },
                )
                break

    # ── 4. Finalise ───────────────────────────────────────────────────────────
    await store.update_job(
        job_id,
        status="completed",
        processedFiles=total,
        matchedFiles=matched,
        currentFile=None,
    )
    print(f"[worker] job {job_id} done — {matched}/{total} matched")


@app.post("/process")
async def process_job(
    req: ProcessJobRequest, background_tasks: BackgroundTasks
):
    background_tasks.add_task(process_job_task, req.dict())
    return {"status": "accepted", "jobId": req.jobId}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000)
