// ─── Job ──────────────────────────────────────────────────────────────────────

export type JobStatus =
  | "pending"
  | "scanning"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface SearchJob {
  id: string;
  status: JobStatus;
  driveFolderId: string;
  driveFolderUrl: string;
  threshold: number;
  totalFiles: number;
  processedFiles: number;
  matchedFiles: number;
  currentFile?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Results ──────────────────────────────────────────────────────────────────

export interface MatchResult {
  driveFileId: string;
  fileName: string;
  driveUrl: string;
  thumbnailUrl?: string;
  similarity: number;           // 0.0 – 1.0
  matchingFaceIndex: number;
  totalFacesInImage: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// ─── API Payloads ─────────────────────────────────────────────────────────────

export interface CreateSearchRequest {
  driveFolderUrl: string;
  referenceImageBase64: string;  // base64-encoded image, deleted after embedding
  threshold?: number;
}

export interface CreateSearchResponse {
  jobId: string;
  status: JobStatus;
}

export interface JobStatusResponse extends SearchJob {
  progress: number;             // 0–100
}

export interface JobResultsResponse {
  jobId: string;
  totalMatches: number;
  results: MatchResult[];
}

// ─── Drive ────────────────────────────────────────────────────────────────────

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  webViewLink?: string;
  thumbnailLink?: string;
}
