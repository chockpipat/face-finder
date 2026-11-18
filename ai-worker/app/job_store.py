"""
job_store.py
Redis helpers that mirror the TypeScript jobStore — same key schema.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone

import redis.asyncio as aioredis

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
JOB_TTL   = int(os.environ.get("JOB_TTL_SECONDS", "3600"))


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def job_key(job_id: str) -> str:
    return f"job:{job_id}"


def results_key(job_id: str) -> str:
    return f"job:{job_id}:results"


class JobStore:
    def __init__(self) -> None:
        self._redis: aioredis.Redis | None = None

    async def connect(self) -> None:
        self._redis = await aioredis.from_url(REDIS_URL, decode_responses=True)

    @property
    def r(self) -> aioredis.Redis:
        assert self._redis is not None, "call connect() first"
        return self._redis

    # ── Job state ─────────────────────────────────────────────────────────────

    async def get_job(self, job_id: str) -> dict | None:
        raw = await self.r.get(job_key(job_id))
        return json.loads(raw) if raw else None

    async def update_job(self, job_id: str, **fields) -> None:
        job = await self.get_job(job_id)
        if not job:
            return
        job.update(fields)
        job["updatedAt"] = _now()
        await self.r.set(job_key(job_id), json.dumps(job), ex=JOB_TTL)

    # ── Results ───────────────────────────────────────────────────────────────

    async def append_result(self, job_id: str, result: dict) -> None:
        await self.r.rpush(results_key(job_id), json.dumps(result))
        await self.r.expire(results_key(job_id), JOB_TTL)
