/**
 * Internal endpoint — called by the Python AI worker, not the browser.
 * The worker can't use NextAuth sessions, so we use a shared internal token.
 *
 * Lists image files in a public Drive folder using GOOGLE_API_KEY.
 * No user access token required — folder must be publicly shared.
 */

import { NextRequest, NextResponse } from "next/server";
import { listImagesInFolder } from "@/lib/drive";

const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN ?? "";

export async function GET(req: NextRequest) {
  // Verify internal caller
  const token = req.headers.get("x-internal-token");
  if (!INTERNAL_TOKEN || token !== INTERNAL_TOKEN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const folderId = req.nextUrl.searchParams.get("folderId");

  if (!folderId) {
    return NextResponse.json(
      { error: "Missing folderId" },
      { status: 400 }
    );
  }

  try {
    const files = await listImagesInFolder(folderId);
    return NextResponse.json({ files });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Drive API error" },
      { status: 500 }
    );
  }
}
