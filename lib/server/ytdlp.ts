import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import ffmpegStatic from "ffmpeg-static";
import { AppError } from "./errors";
import { runQueued } from "./process";

function ytdlpPath() {
  if (process.env.YTDLP_PATH) return process.env.YTDLP_PATH;
  const local = join(process.cwd(), "bin", process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp");
  return existsSync(local) ? local : "yt-dlp";
}

/** A real file path, or null to let yt-dlp find ffmpeg on PATH itself. */
function ffmpegPath(): string | null {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  return ffmpegStatic && existsSync(ffmpegStatic) ? ffmpegStatic : null;
}

function probe(bin: string, args: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn(bin, args, { windowsHide: true });
    let out = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), 8_000);
    child.stdout.on("data", (chunk: Buffer) => (out += chunk.toString()));
    child.on("error", () => {
      clearTimeout(timer);
      resolve(null);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve(code === 0 ? out.trim().split("\n")[0] : null);
    });
  });
}

/** What to spawn when running ffmpeg directly. */
export function ffmpegBin() {
  return ffmpegPath() ?? "ffmpeg";
}

let engineCache: { at: number; status: { ytdlp: string | null; ffmpeg: boolean } } | null = null;

/** Cached for a minute so a health check every few seconds doesn't spawn two processes each time. */
export async function engineStatus() {
  if (engineCache && Date.now() - engineCache.at < 60_000) return engineCache.status;
  const [ytdlp, ffmpeg] = await Promise.all([probe(ytdlpPath(), ["--version"]), probe(ffmpegBin(), ["-version"])]);
  engineCache = { at: Date.now(), status: { ytdlp, ffmpeg: ffmpeg !== null } };
  return engineCache.status;
}

function baseArgs() {
  // Instagram often refuses anonymous server requests; an operator-supplied cookies file helps. Visitors never log in.
  const cookies = process.env.YTDLP_COOKIES_FILE ? ["--cookies", process.env.YTDLP_COOKIES_FILE] : [];
  // --ffmpeg-location needs a path; a bare "ffmpeg" makes yt-dlp report it missing.
  const ffmpeg = ffmpegPath();
  return [
    ...cookies,
    ...(ffmpeg ? ["--ffmpeg-location", ffmpeg] : []),
    "--ignore-config",
    "--no-progress",
    "--no-warnings",
    "--socket-timeout",
    "20",
    // YouTube needs a JS runtime to solve its player challenge; reuse the Node running this server.
    "--js-runtimes",
    `node:${process.execPath}`,
  ];
}

export function mapYtdlpError(stderr: string): AppError {
  const text = stderr.toLowerCase();
  // Checked first: "ffmpeg not found" would otherwise read as a missing post.
  if (/ffmpeg (and ffprobe )?not found|ffprobe and ffmpeg not found/.test(text)) return new AppError("ENGINE_MISSING");
  if (text.includes("unsupported url")) return new AppError("UNSUPPORTED");
  if (/no video (formats )?(found|in this post)|there is no video/.test(text)) return new AppError("NO_MEDIA");
  if (/login|log in|sign in|cookies|rate-limit|confirm you.?re not a bot/.test(text)) {
    return new AppError("LOGIN_REQUIRED");
  }
  if (/ip address is blocked|not available in your country|geo.?restrict/.test(text)) return new AppError("REFUSED");
  if (/private|unavailable|removed|does not exist|not found|404|deleted/.test(text)) {
    return new AppError("NOT_FOUND");
  }
  return new AppError("UPSTREAM");
}

/** Runs yt-dlp without a shell, so the user-supplied URL is never parsed as a command. */
export async function runYtdlp(args: string[], options: { signal?: AbortSignal; timeoutMs?: number } = {}) {
  const result = await runQueued(ytdlpPath(), [...baseArgs(), ...args], options);
  if (result.code === 0) return result.stdout;
  if (result.stderr) console.warn("[weelink] yt-dlp:", result.stderr.trim().split("\n").slice(-3).join(" | "));
  throw mapYtdlpError(result.stderr);
}
