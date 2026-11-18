import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { extractFolderId } from "@/lib/drive";
import { createJob } from "@/lib/jobStore";
import type { SearchJob } from "@/types";

// ─── Validation ───────────────────────────────────────────────────────────────

const CreateSearchSchema = z.object({
  driveFolderUrl: z.string().url(),
  referenceImageBase64: z.string().min(100), // base64 image data
  threshold: z.number().min(0.1).max(1.0).default(0.5),
});

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Parse & validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parse = CreateSearchSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parse.error.flatten() },
      { status: 400 }
    );
  }

  const { driveFolderUrl, referenceImageBase64, threshold } = parse.data;

  // Extract folder ID from URL
  const folderId = extractFolderId(driveFolderUrl);
  if (!folderId) {
    return NextResponse.json(
      { error: "Invalid Google Drive folder URL" },
      { status: 400 }
    );
  }

  // Create job record in Redis (auto-expires per JOB_TTL)
  const jobId = uuidv4();
  const now = new Date().toISOString();

  const job: SearchJob = {
    id: jobId,
    status: "pending",
    driveFolderId: folderId,
    driveFolderUrl,
    threshold,
    totalFiles: 0,
    processedFiles: 0,
    matchedFiles: 0,
    createdAt: now,
    updatedAt: now,
  };

  await createJob(job);

  // Trigger AI worker directly
  const aiWorkerUrl = process.env.AI_WORKER_URL ?? "http://ai-worker:8000";
  try {
    const res = await fetch(`${aiWorkerUrl}/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId,
        driveFolderId: folderId,
        referenceImageBase64,
        threshold,
      }),
    });

    if (!res.ok) {
      console.error("AI worker error:", await res.text());
    }
  } catch (err) {
    console.error("Failed to reach AI worker:", err);
  }

  return NextResponse.json({ jobId, status: "pending" }, { status: 202 });
}
