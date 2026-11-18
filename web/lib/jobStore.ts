/**
 * jobStore.ts
 *
 * All search-job state is stored in Redis with a TTL.
 * Nothing is persisted to a database — when the TTL expires the data is gone.
 */

import { redis, keys, JOB_TTL } from "./redis";
import type { SearchJob, JobStatus, MatchResult } from "@/types";

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createJob(job: SearchJob): Promise<void> {
  await redis.set(keys.job(job.id), JSON.stringify(job), "EX", JOB_TTL);
}

export async function updateJob(
  id: string,
  patch: Partial<SearchJob>
): Promise<SearchJob | null> {
  const existing = await getJob(id);
  if (!existing) return null;

  const updated: SearchJob = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await redis.set(keys.job(id), JSON.stringify(updated), "EX", JOB_TTL);
  return updated;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getJob(id: string): Promise<SearchJob | null> {
  const raw = await redis.get(keys.job(id));
  if (!raw) return null;
  return JSON.parse(raw) as SearchJob;
}

// ─── Results ──────────────────────────────────────────────────────────────────

export async function appendResult(
  jobId: string,
  result: MatchResult
): Promise<void> {
  // Store each match as a separate list entry; trimmed TTL is reset on each push
  await redis.rpush(keys.results(jobId), JSON.stringify(result));
  await redis.expire(keys.results(jobId), JOB_TTL);
}

export async function getResults(jobId: string): Promise<MatchResult[]> {
  const raw = await redis.lrange(keys.results(jobId), 0, -1);
  return raw.map((r) => JSON.parse(r) as MatchResult);
}

// ─── Cleanup (explicit) ───────────────────────────────────────────────────────

export async function deleteJob(id: string): Promise<void> {
  await redis.del(keys.job(id), keys.results(id));
}
