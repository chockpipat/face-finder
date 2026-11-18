"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ExternalLink, ArrowLeft, Trash2 } from "lucide-react";
import type { JobResultsResponse, MatchResult } from "@/types";

export default function ResultsPage() {
  const { id: jobId } = useParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<JobResultsResponse | null>(null);
  const [minSimilarity, setMinSimilarity] = useState(0);
  const [loading, setLoading] = useState(true);

  // ── Fetch results once ────────────────────────────────────────────────────

  useEffect(() => {
    fetch(`/api/jobs/${jobId}/results`)
      .then((r) => r.json())
      .then((d: JobResultsResponse) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [jobId]);

  // ── Explicit cleanup ──────────────────────────────────────────────────────

  async function handleDelete() {
    if (!confirm("ลบผลการค้นหานี้?")) return;
    await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
    router.push("/");
  }

  // ── Filter ────────────────────────────────────────────────────────────────

  const results =
    data?.results.filter((r) => r.similarity >= minSimilarity / 100) ?? [];

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-slate-400">
        กำลังโหลดผลลัพธ์...
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 max-w-6xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="text-slate-400 hover:text-white transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">ผลการค้นหา</h1>
            <p className="text-slate-400 text-sm">
              พบ{" "}
              <span className="text-green-400 font-bold">
                {data?.totalMatches ?? 0}
              </span>{" "}
              รูป
            </p>
          </div>
        </div>

        <button
          onClick={handleDelete}
          className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 rounded-xl px-3 py-2 transition"
        >
          <Trash2 size={14} /> ลบผลลัพธ์
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4 mb-6 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
        <span className="text-sm text-slate-400">แสดงเฉพาะความคล้าย ≥</span>
        <input
          type="range"
          min={0}
          max={99}
          value={minSimilarity}
          onChange={(e) => setMinSimilarity(Number(e.target.value))}
          className="flex-1 accent-brand-500"
        />
        <span className="font-mono text-brand-400 text-sm w-12 text-right">
          {minSimilarity}%
        </span>
        <span className="text-slate-500 text-sm">({results.length} รูป)</span>
      </div>

      {/* Grid */}
      {results.length === 0 ? (
        <div className="text-center text-slate-500 py-20">
          ไม่พบรูปที่ตรงกับเงื่อนไข
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {results.map((match) => (
            <ResultCard key={match.driveFileId} match={match} />
          ))}
        </div>
      )}
    </main>
  );
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function ResultCard({ match }: { match: MatchResult }) {
  const pct = Math.round(match.similarity * 100);

  const badgeColor =
    pct >= 90
      ? "bg-green-500"
      : pct >= 70
      ? "bg-yellow-500"
      : "bg-orange-500";

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-brand-500 transition group">
      {/* Thumbnail */}
      <div className="aspect-square bg-slate-800 relative">
        {match.thumbnailUrl ? (
          <img
            src={match.thumbnailUrl}
            alt={match.fileName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
            ไม่มีรูปตัวอย่าง
          </div>
        )}

        {/* Similarity badge */}
        <span
          className={`absolute top-2 right-2 text-xs font-bold text-white px-2 py-0.5 rounded-full ${badgeColor}`}
        >
          {pct}%
        </span>
      </div>

      {/* Info */}
      <div className="p-3 space-y-1">
        <p className="text-xs text-slate-300 truncate" title={match.fileName}>
          {match.fileName}
        </p>
        <p className="text-xs text-slate-500">
          ใบหน้า #{match.matchingFaceIndex + 1} จาก {match.totalFacesInImage} คน
        </p>
        <a
          href={match.driveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition mt-1"
        >
          <ExternalLink size={12} /> เปิดใน Drive
        </a>
      </div>
    </div>
  );
}
