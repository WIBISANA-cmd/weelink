import { detectPlatform } from "@/lib/platforms";
import type { MediaInfo } from "@/lib/types";
import { AppError } from "./errors";
import { normalize, type YtInfo } from "./normalize";
import { resolveFromOpenGraph } from "./og-fallback";
import { envNumber } from "./env";
import { assertPublicUrl } from "./url-guard";
import { resolveThreads } from "./threads";
import { runYtdlp } from "./ytdlp";

const FALLBACK_CODES = new Set(["UNSUPPORTED", "NO_MEDIA", "LOGIN_REQUIRED"]);

// Shown when the browser render is off, unavailable, or finds nothing; "use a post link" would mislead.
const THREADS_MESSAGE =
  "Media postingan Threads ini tidak bisa diambil. Pastikan akunnya publik dan postingannya berisi foto atau video, lalu coba lagi.";

export async function resolveMedia(rawUrl: string, signal?: AbortSignal): Promise<MediaInfo> {
  const url = assertPublicUrl(rawUrl).toString();
  const platform = detectPlatform(url) ?? { id: "other" as const, name: "situs lain" };

  // yt-dlp has no Threads extractor, so skip straight to rendering the public post.
  if (platform.id === "threads") {
    const media = (await resolveThreads(url, signal)) ?? (await resolveFromOpenGraph(url, platform.id, platform.name));
    if (media) return media;
    throw new AppError("UNSUPPORTED", THREADS_MESSAGE);
  }

  let info: YtInfo;
  try {
    const json = await runYtdlp(["--dump-single-json", "--no-playlist", "--", url], { signal, timeoutMs: 60_000 });
    info = JSON.parse(json) as YtInfo;
  } catch (error) {
    if (error instanceof AppError && FALLBACK_CODES.has(error.code)) {
      const fallback = await resolveFromOpenGraph(url, platform.id, platform.name);
      if (fallback) return fallback;
    }
    throw error;
  }

  const maxDuration = envNumber("MAX_DURATION_SECONDS", 3 * 60 * 60);
  if (info.duration && info.duration > maxDuration) throw new AppError("TOO_LONG");

  const media = normalize(info, url, platform.id, platform.name);
  if (media.entries.length === 0) throw new AppError("NO_MEDIA");
  return media;
}
