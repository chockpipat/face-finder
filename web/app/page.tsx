"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FolderOpen, Search, Info } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();

  const [driveUrl, setDriveUrl] = useState("");
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [facePreview, setFacePreview] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0.5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Face image selection ──────────────────────────────────────────────────

  function handleFaceSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFaceFile(file);
    setFacePreview(URL.createObjectURL(file));
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setError(null);

    if (!driveUrl.trim()) {
      setError("กรุณาใส่ลิงก์โฟลเดอร์ Google Drive");
      return;
    }
    if (!faceFile) {
      setError("กรุณาอัปโหลดรูปใบหน้า");
      return;
    }

    setLoading(true);

    try {
      const base64 = await toBase64(faceFile);

      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driveFolderUrl: driveUrl,
          referenceImageBase64: base64,
          threshold,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "เกิดข้อผิดพลาด");
      }

      const { jobId } = await res.json();
      router.push(`/search/${jobId}`);
    } catch (err: any) {
      setError(err.message ?? "เกิดข้อผิดพลาดไม่ทราบสาเหตุ");
    } finally {
      setLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Search className="text-brand-500" size={32} />
          <h1 className="text-3xl font-bold text-white">Face Finder</h1>
        </div>
        <p className="text-slate-400">ค้นหารูปตัวเองจาก Google Drive</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 shadow-xl">

        {/* Step 1 — Google Drive */}
        <section>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            <span className="inline-flex items-center gap-2">
              <FolderOpen size={16} className="text-brand-500" />
              ① Google Drive Folder
            </span>
          </label>

          <input
            type="url"
            id="drive-folder-url"
            placeholder="https://drive.google.com/drive/folders/..."
            value={driveUrl}
            onChange={(e) => setDriveUrl(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          {/* Hint */}
          <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
            <Info size={12} className="mt-0.5 shrink-0 text-slate-600" />
            โฟลเดอร์ต้องถูกตั้งค่าเป็น{" "}
            <span className="text-slate-400 font-medium">
              &quot;Anyone with the link can view&quot;
            </span>{" "}
            (แชร์แบบสาธารณะ)
          </p>
        </section>

        {/* Step 2 — Reference face */}
        <section>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            <span className="inline-flex items-center gap-2">
              <Upload size={16} className="text-brand-500" />
              ② รูปใบหน้าของคุณ
            </span>
          </label>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-brand-500 transition"
          >
            {facePreview ? (
              <img
                src={facePreview}
                alt="Reference face"
                className="h-32 w-32 object-cover rounded-full border-2 border-brand-500"
              />
            ) : (
              <>
                <Upload size={32} className="text-slate-600 mb-2" />
                <p className="text-sm text-slate-500">คลิกเพื่ออัปโหลดรูปใบหน้า</p>
                <p className="text-xs text-slate-600 mt-1">JPG, PNG, WEBP</p>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFaceSelect}
            className="hidden"
          />
        </section>

        {/* Step 3 — Threshold */}
        <section>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            ③ ความเข้มงวดในการค้นหา
          </label>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">กว้าง</span>
            <input
              type="range"
              min={0.3}
              max={0.8}
              step={0.05}
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="flex-1 accent-brand-500"
            />
            <span className="text-xs text-slate-500">แม่นยำ</span>
            <span className="text-xs font-mono text-brand-500 w-8">
              {threshold.toFixed(2)}
            </span>
          </div>
        </section>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400 bg-red-950 border border-red-800 rounded-xl px-4 py-2">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          id="start-search-btn"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? (
            <>
              <span className="animate-spin">⟳</span> กำลังสร้างงาน...
            </>
          ) : (
            <>
              <Search size={18} /> เริ่มค้นหา
            </>
          )}
        </button>

        <p className="text-xs text-center text-slate-600">
          รูปใบหน้าและข้อมูลจะถูกลบหลังค้นหาเสร็จ ไม่มีการบันทึกข้อมูลถาวร
        </p>
      </div>
    </main>
  );
}
