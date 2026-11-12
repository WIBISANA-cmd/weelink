import { rm } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import type { MediaMode } from "@/lib/types";
import { AppError } from "./errors";
import { runQueued } from "./process";
import { ffmpegBin } from "./ytdlp";

interface MediaProbe {
  video?: { codec: string; pixFmt?: string };
  audio?: { codec: string };
}

/** Reads codecs from `ffmpeg -i`, which lists streams on stderr; ffprobe is not shipped. */
async function probe(file: string, signal: AbortSignal): Promise<MediaProbe> {
  const { stderr } = await runQueued(ffmpegBin(), ["-hide_banner", "-i", file], { signal, timeoutMs: 30_000 });
  const videoLine = stderr.match(/Stream #[^\n]*?Video: ([^\n]*)/)?.[1];
  const audioCodec = stderr.match(/Stream #[^\n]*?Audio: (\w+)/)?.[1];
  return {
    video: videoLine ? { codec: videoLine.split(/[\s,]/)[0], pixFmt: videoLine.match(/,\s*([a-z0-9_]+)[(,]/)?.[1] } : undefined,
    audio: audioCodec ? { codec: audioCodec } : undefined,
  };
}

async function transcode(input: string, output: string, args: string[], signal: AbortSignal) {
  const result = await runQueued(ffmpegBin(), ["-hide_banner", "-loglevel", "error", "-y", "-i", input, ...args, output], {
    signal,
    timeoutMs: 30 * 60_000,
  });
  if (result.code !== 0) {
    console.warn("[weelink] ffmpeg:", result.stderr.trim().split("\n").slice(-3).join(" | "));
    throw new AppError("UPSTREAM");
  }
  await rm(input, { force: true });
  return output;
}

// iPhone galleries and Files cannot open VP9 or AV1 (Meta's CDN serves both), and stock Windows lacks HEVC.
// H.264 in 8-bit 4:2:0 with AAC is the one combination every phone and desktop opens.
const PLAYABLE_VIDEO = new Set(["h264"]);
const PLAYABLE_PIXFMT = new Set(["yuv420p", "yuvj420p"]);
const PLAYABLE_IMAGE = new Set(["mjpeg", "png"]);

/**
 * Returns a file that opens on any device: rejects non-media (an HTML error page saved as .mp4),
 * re-encodes only what is not already compatible, and stream-copies the rest.
 */
export async function ensurePlayable(file: string, mode: MediaMode, kbps: number | undefined, signal: AbortSignal): Promise<string> {
  if (process.env.COMPAT_TRANSCODE === "0") return file;

  const info = await probe(file, signal);
  const dir = dirname(file);
  const ext = extname(file).slice(1).toLowerCase();

  if (mode === "image") {
    if (!info.video) throw new AppError("NO_MEDIA");
    if (PLAYABLE_IMAGE.has(info.video.codec)) return file;
    console.info(`[weelink] gambar ${info.video.codec} dikonversi ke JPG`);
    return transcode(file, join(dir, "compat.jpg"), ["-frames:v", "1", "-q:v", "2"], signal);
  }

  if (mode === "audio") {
    if (!info.audio) throw new AppError("NO_MEDIA");
    if (info.audio.codec === "mp3" && !info.video) return file;
    return transcode(file, join(dir, "compat.mp3"), ["-vn", "-c:a", "libmp3lame", "-b:a", `${kbps ?? 192}k`], signal);
  }

  if (!info.video) throw new AppError("NO_MEDIA");
  const videoOk = PLAYABLE_VIDEO.has(info.video.codec) && PLAYABLE_PIXFMT.has(info.video.pixFmt ?? "");
  const audioOk = !info.audio || info.audio.codec === "aac";
  if (videoOk && audioOk && ext === "mp4") return file;

  console.info(`[weelink] video ${info.video.codec}/${info.video.pixFmt ?? "?"} + ${info.audio?.codec ?? "tanpa audio"} dikonversi ke H.264/AAC`);
  return transcode(
    file,
    join(dir, "compat.mp4"),
    [
      "-map", "0:v:0",
      "-map", "0:a:0?",
      ...(videoOk ? ["-c:v", "copy"] : ["-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p"]),
      ...(info.audio?.codec === "aac" ? ["-c:a", "copy"] : ["-c:a", "aac", "-b:a", "160k"]),
      "-movflags", "+faststart",
    ],
    signal,
  );
}
