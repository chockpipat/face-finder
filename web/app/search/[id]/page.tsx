"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Search, X } from "lucide-react";
import type { JobStatusResponse } from "@/types";

const STATUS_LABEL: Record<string, string> = {
  pending:    "รอดำเนินการ...",
  scanning:   "กำลังสแกนโฟลเดอร์...",
  processing: "กำลังวิเคราะห์ใบหน้า...",
  completed:  "เสร็จสิ้น!",
  failed:     "เกิดข้อผิดพลาด",
  cancelled:  "ยกเลิกแล้ว",
};

export default function SearchProgressPage() {
  const router = useRouter();
  const { id: jobId } = useParams<{ id: string }>();

  const [job, setJob] = useState<JobStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Poll every 1.5 s ─────────────────────────────────────────────────────

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) throw new Error("ไม่พบงานนี้");
      const data: JobStatusResponse = await res.json();
      setJob(data);

      if (data.status === "completed") {
        router.push(`/results/${jobId}`);
      } else if (data.status === "failed") {
        setError(data.errorMessage ?? "เกิดข้อผิดพลาด");
      }
    } catch (e: any) {
      setError(e.message);
    }
  }, [jobId, router]);

  useEffect(() => {
    poll();
    const timer = setInterval(poll, 1500);
    return () => clearInterval(timer);
  }, [poll]);

  // ── Cancel ────────────────────────────────────────────────────────────────

  async function handleCancel() {
    await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
    router.push("/");
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">

        {/* Icon + title */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/20 mb-4">
            <Search className="text-brand-500 animate-pulse" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-white">กำลังค้นหารูปของคุณ...</h1>
          <p className="text-slate-400 text-sm mt-1">
            {job ? STATUS_LABEL[job.status] ?? job.status : "กำลังโหลด..."}
          </p>
        </div>

        {/* Progress bar */}
        {job && (
          <div className="space-y-3">
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full bg-brand-500 transition-all duration-500"
                style={{ width: `${job.progress}%` }}
              />
            </div>
            <div className="text-right text-sm font-mono text-brand-400">
              {job.progress}%
            </div>

            {/* Stats */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <Stat label="พบรูปทั้งหมด"       value={job.totalFiles} />
              <Stat label="ประมวลผลแล้ว"        value={job.processedFiles} />
              <Stat label="พบใบหน้าที่ตรงกัน"  value={job.matchedFiles} highlight />
            </div>

            {/* Current file */}
            {job.currentFile && (
              <p className="text-xs text-slate-500 text-center truncate">
                กำลังประมวลผล: {job.currentFile}
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400 bg-red-950 border border-red-800 rounded-xl px-4 py-3 text-center">
            {error}
          </p>
        )}

        {/* Cancel button */}
        {job && !["completed", "failed", "cancelled"].includes(job.status) && (
          <button
            onClick={handleCancel}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition"
          >
            <X size={16} /> ยกเลิกการค้นหา
          </button>
        )}
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-400 text-sm">{label}</span>
      <span
        className={`font-mono font-bold text-lg ${
          highlight ? "text-green-400" : "text-white"
        }`}
      >
        {value.toLocaleString()}
      </span>
    </div>
  );
}
