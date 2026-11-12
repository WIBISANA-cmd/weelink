import { detectPlatform } from "@/lib/platforms";
import type { MediaInfo } from "@/lib/types";
import { AppError } from "./errors";
import { normalize, type YtInfo } from "./normalize";
import { resolveFromOpenGraph } from "./og-fallback";
import { envNumber } from "./env";
import { assertPublicUrl } from "./url-guard";
import { runYtdlp } from "./ytdlp";

const FALLBACK_CODES = new Set(["UNSUPPORTED", "NO_MEDIA", "LOGIN_REQUIRED"]);

export async function resolveMedia(rawUrl: string, signal?: AbortSignal): Promise<MediaInfo> {
  const url = assertPublicUrl(rawUrl).toString();
  const platform = detectPlatform(url) ?? { id: "other" as const, name: "situs lain" };

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
