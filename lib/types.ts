import type { PlatformId } from "./platforms";

export type MediaMode = "video" | "audio" | "image";

export interface DownloadOption {
  id: string;
  mode: MediaMode;
  /** Big numeral on the key, e.g. "1080", "320", "Asli". */
  value: string;
  /** Unit next to the numeral, e.g. "p", "kbps". */
  unit?: string;
  /** Upstream size estimate in bytes; absent when the source does not report one. */
  sizeBytes?: number;
  token: string;
}

export interface MediaEntry {
  id: string;
  title: string;
  previewUrl?: string;
  width?: number;
  height?: number;
  durationSec?: number;
  options: DownloadOption[];
}

export interface MediaInfo {
  platform: PlatformId;
  sourceUrl: string;
  title: string;
  author?: string;
  entries: MediaEntry[];
}

export type ErrorCode =
  | "INVALID_URL"
  | "BLOCKED_URL"
  | "UNSUPPORTED"
  | "NOT_FOUND"
  | "LOGIN_REQUIRED"
  | "NO_MEDIA"
  | "REFUSED"
  | "TOO_LONG"
  | "RATE_LIMITED"
  | "ENGINE_MISSING"
  | "TOKEN_EXPIRED"
  | "UPSTREAM";

export interface ApiErrorBody {
  error: { code: ErrorCode; message: string };
}
