import { Queue } from "bullmq";
import IORedis from "ioredis";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL environment variable is not set");
}

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
});

// ─── Queue ────────────────────────────────────────────────────────────────────

export interface ScanJobPayload {
  jobId: string;
  driveFolderId: string;
  /** Base64 reference image — AI worker generates embedding then discards */
  referenceImageBase64: string;
  threshold: number;
}

export const searchQueue = new Queue<ScanJobPayload>("face-search", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: true,
    removeOnFail: true,
  },
});
