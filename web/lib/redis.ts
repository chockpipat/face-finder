import Redis from "ioredis";

// Singleton — reuse connection across hot-reloads in dev
const globalForRedis = global as unknown as { redis?: Redis };

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL environment variable is not set");
}

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

// ─── Job TTL ──────────────────────────────────────────────────────────────────

const parsedTTL = parseInt(process.env.JOB_TTL_SECONDS ?? "3600", 10);
export const JOB_TTL = Number.isNaN(parsedTTL) ? 3600 : parsedTTL;

// ─── Key helpers ──────────────────────────────────────────────────────────────

export const keys = {
  job:     (id: string) => `job:${id}`,
  results: (id: string) => `job:${id}:results`,
};
