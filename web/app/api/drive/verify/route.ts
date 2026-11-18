import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { extractFolderId } from "@/lib/drive";

/**
 * Verify that a Drive folder URL is accessible as a public/shared folder.
 * Uses GOOGLE_API_KEY — no user auth required.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  const folderId = extractFolderId(url);
  if (!folderId) {
    return NextResponse.json({ error: "Invalid Drive URL" }, { status: 400 });
  }

  try {
    const drive = google.drive({
      version: "v3",
      auth: process.env.GOOGLE_API_KEY,
    });

    const res = await drive.files.get({
      fileId: folderId,
      fields: "id, name, mimeType",
    });

    if (res.data.mimeType !== "application/vnd.google-apps.folder") {
      return NextResponse.json(
        { error: "URL is not a Drive folder" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      folderId,
      folderName: res.data.name,
      accessible: true,
    });
  } catch (err: any) {
    const status = err?.code === 404 ? 404 : 403;
    return NextResponse.json(
      {
        error:
          "ไม่สามารถเข้าถึงโฟลเดอร์ได้ — กรุณาตรวจสอบว่าโฟลเดอร์ถูกตั้งเป็น 'Anyone with the link'",
      },
      { status }
    );
  }
}
