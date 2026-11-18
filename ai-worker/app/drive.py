"""
drive.py
Download individual files from publicly shared Google Drive folders.
No OAuth token required — uses public export URL.
"""

from __future__ import annotations

import httpx

# Public export URL for Drive files (works for publicly shared files)
DRIVE_EXPORT_URL = "https://drive.google.com/uc?export=download&id={file_id}"

# Some large files redirect through a confirmation page — handle both
DRIVE_CONFIRM_URL = (
    "https://drive.usercontent.google.com/download"
    "?id={file_id}&export=download&authuser=0&confirm=t"
)


async def download_image(file_id: str) -> bytes | None:
    """
    Download a file's bytes from a publicly shared Google Drive folder.
    Returns None on failure.
    """
    url = DRIVE_EXPORT_URL.format(file_id=file_id)

    try:
        async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
            res = await client.get(url)

            # Google may redirect large files through a confirmation page
            # In that case, fall back to the usercontent URL
            if res.status_code == 200 and b"virus scan warning" in res.content[:2048]:
                res = await client.get(
                    DRIVE_CONFIRM_URL.format(file_id=file_id)
                )

            res.raise_for_status()
            return res.content
    except Exception as exc:
        print(f"[drive] download failed for {file_id}: {exc}")
        return None
