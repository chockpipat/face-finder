import { google } from "googleapis";
import type { DriveFile } from "@/types";

// ─── Folder ID extraction ─────────────────────────────────────────────────────

const FOLDER_RE =
  /(?:drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/)([a-zA-Z0-9_-]+)/;

export function extractFolderId(url: string): string | null {
  const match = url.match(FOLDER_RE);
  return match?.[1] ?? null;
}

// ─── Image MIME types we process ─────────────────────────────────────────────

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

// ─── Drive client factory (API Key — no OAuth needed) ────────────────────────

function makeDriveClient() {
  return google.drive({
    version: "v3",
    auth: process.env.GOOGLE_API_KEY,
  });
}

// ─── List images in a public folder ──────────────────────────────────────────

export async function listImagesInFolder(
  folderId: string
): Promise<DriveFile[]> {
  const drive = makeDriveClient();
  const mimeQuery = IMAGE_MIME_TYPES.map((m) => `mimeType='${m}'`).join(" or ");
  const query = `'${folderId}' in parents and (${mimeQuery}) and trashed=false`;

  const files: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const res = await drive.files.list({
      q: query,
      fields: "nextPageToken, files(id, name, mimeType, size, webViewLink)",
      pageSize: 100,
      pageToken,
    });

    const batch = res.data.files ?? [];
    for (const f of batch) {
      if (f.id && f.name && f.mimeType) {
        files.push({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          size: f.size ? parseInt(f.size, 10) : undefined,
          webViewLink: f.webViewLink ?? undefined,
          // Thumbnail via public export URL (works without auth)
          thumbnailLink: `https://drive.google.com/thumbnail?id=${f.id}&sz=w400`,
        });
      }
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return files;
}

// ─── Download image as Buffer (public export URL — no auth) ──────────────────

export async function downloadImageAsBuffer(fileId: string): Promise<Buffer> {
  // Public export URL — works for files in publicly shared folders
  const url = `https://drive.google.com/uc?export=download&id=${fileId}`;

  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Drive download failed: ${res.status} ${res.statusText}`);
  }
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}
