import { unstable_rethrow } from "next/navigation";
import type { ApiErrorBody, ErrorCode } from "@/lib/types";

const STATUS: Record<ErrorCode, number> = {
  INVALID_URL: 400,
  BLOCKED_URL: 400,
  UNSUPPORTED: 422,
  NOT_FOUND: 404,
  LOGIN_REQUIRED: 403,
  NO_MEDIA: 422,
  REFUSED: 403,
  TOO_LONG: 413,
  RATE_LIMITED: 429,
  ENGINE_MISSING: 503,
  TOKEN_EXPIRED: 410,
  UPSTREAM: 502,
};

const MESSAGES: Record<ErrorCode, string> = {
  INVALID_URL: "Itu belum terlihat seperti link. Salin ulang dari tombol Bagikan di aplikasinya.",
  BLOCKED_URL: "Link ini mengarah ke alamat lokal atau privat, jadi tidak bisa diproses.",
  UNSUPPORTED: "Situs ini belum bisa dibaca. Coba link langsung ke postingan, bukan ke profil.",
  NOT_FOUND: "Postingan tidak ditemukan. Mungkin sudah dihapus, privat, atau linknya terpotong.",
  LOGIN_REQUIRED: "Platform meminta login untuk postingan ini, jadi WeeLink tidak bisa mengambilnya. Pastikan akunnya publik, lalu coba lagi beberapa saat lagi.",
  NO_MEDIA: "Tidak ada video, audio, atau gambar yang bisa diambil dari link ini.",
  REFUSED: "Platform menolak permintaan dari server untuk postingan ini, atau postingannya sudah tidak ada. Cek linknya, lalu coba postingan lain.",
  TOO_LONG: "Durasinya melebihi batas server ini. Coba video yang lebih pendek.",
  RATE_LIMITED: "Terlalu banyak permintaan dalam waktu singkat. Tunggu sebentar lalu coba lagi.",
  ENGINE_MISSING: "Mesin pengunduh belum terpasang di server. Jalankan npm run setup.",
  TOKEN_EXPIRED: "Link unduhan ini sudah kedaluwarsa. Tempel ulang link postingannya.",
  UPSTREAM: "Platform sedang tidak merespons dengan benar. Coba lagi sebentar lagi.",
};

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message?: string,
  ) {
    super(message ?? MESSAGES[code]);
  }

  get status() {
    return STATUS[this.code];
  }
}

export function errorResponse(error: unknown): Response {
  // Next.js signals such as "bail out of prerendering" travel as thrown errors and must reach the framework.
  unstable_rethrow(error);

  // The browser cancelled the request; nobody is waiting for a body.
  if (error instanceof Error && error.name === "AbortError") return new Response(null, { status: 499 });

  const appError = error instanceof AppError ? error : new AppError("UPSTREAM");
  if (!(error instanceof AppError)) console.error("[weelink]", error);

  const body: ApiErrorBody = { error: { code: appError.code, message: appError.message } };
  return Response.json(body, { status: appError.status });
}
