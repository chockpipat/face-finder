import { NextRequest, NextResponse } from "next/server";
import { getJob, deleteJob } from "@/lib/jobStore";

// ─── GET /api/jobs/:id — polling endpoint ─────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const job = await getJob(params.id);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const progress =
    job.totalFiles > 0
      ? Math.round((job.processedFiles / job.totalFiles) * 100)
      : 0;

  return NextResponse.json({ ...job, progress });
}

// ─── DELETE /api/jobs/:id — explicit cleanup ──────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const job = await getJob(params.id);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  await deleteJob(params.id);
  return NextResponse.json({ deleted: true });
}
