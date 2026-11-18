import { NextRequest, NextResponse } from "next/server";
import { getJob, getResults } from "@/lib/jobStore";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const job = await getJob(params.id);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const results = await getResults(params.id);

  // Sort by similarity descending
  results.sort((a, b) => b.similarity - a.similarity);

  return NextResponse.json({
    jobId: params.id,
    totalMatches: results.length,
    results,
  });
}
