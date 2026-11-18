"""
face_engine.py
Thin wrapper around InsightFace / ArcFace for detection + embedding.
"""

from __future__ import annotations

import numpy as np
from dataclasses import dataclass
from PIL import Image
import io

import insightface
from insightface.app import FaceAnalysis

# ─── Types ────────────────────────────────────────────────────────────────────

@dataclass
class DetectedFace:
    index: int
    embedding: np.ndarray       # 512-d float32 ArcFace vector
    bbox: tuple[int, int, int, int]  # x, y, w, h
    confidence: float


# ─── Engine ───────────────────────────────────────────────────────────────────

class FaceEngine:
    def __init__(self) -> None:
        self._app: FaceAnalysis | None = None

    def _get_app(self) -> FaceAnalysis:
        if self._app is None:
            self._app = FaceAnalysis(
                name="buffalo_l",           # ArcFace-based model
                providers=["CPUExecutionProvider"],
            )
            self._app.prepare(ctx_id=0, det_size=(640, 640))
        return self._app

    # ── Public API ────────────────────────────────────────────────────────────

    def get_faces(self, image_bytes: bytes) -> list[DetectedFace]:
        """Detect all faces in an image and return their embeddings."""
        img = self._decode(image_bytes)
        if img is None:
            return []

        faces = self._get_app().get(img)

        result = []
        for i, face in enumerate(faces):
            box = face.bbox.astype(int)  # [x1, y1, x2, y2]
            x, y = int(box[0]), int(box[1])
            w = int(box[2]) - x
            h = int(box[3]) - y

            result.append(
                DetectedFace(
                    index=i,
                    embedding=face.normed_embedding.astype(np.float32),
                    bbox=(x, y, w, h),
                    confidence=float(face.det_score),
                )
            )
        return result

    def cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """Cosine similarity between two L2-normalised embeddings."""
        return float(np.dot(a, b))

    # ── Internal ──────────────────────────────────────────────────────────────

    @staticmethod
    def _decode(image_bytes: bytes):
        """Convert bytes → BGR numpy array expected by InsightFace."""
        try:
            import cv2
            arr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if img is None:
                # Fallback: PIL → numpy
                pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
                img = np.array(pil)[:, :, ::-1]  # RGB → BGR
            return img
        except Exception as exc:
            print(f"[face_engine] decode error: {exc}")
            return None


# Singleton
engine = FaceEngine()
