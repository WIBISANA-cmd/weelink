import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import ffmpegStatic from "ffmpeg-static";
import { AppError } from "./errors";
import { envNumber } from "./env";

function ytdlpPath() {
  if (process.env.YTDLP_PATH) return process.env.YTDLP_PATH;
  const local = join(process.cwd(), "bin", process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp");
  return existsSync(local) ? local : "yt-dlp";
}

export function ffmpegPath() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  return ffmpegStatic && existsSync(ffmpegStatic) ? ffmpegStatic : "ffmpeg";
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

let engineCache: { at: number; status: { ytdlp: string | null; ffmpeg: boolean } } | null = null;

/** Cached for a minute so a health check every few seconds doesn't spawn two processes each time. */
export async function engineStatus() {
  if (engineCache && Date.now() - engineCache.at < 60_000) return engineCache.status;
  const [ytdlp, ffmpeg] = await Promise.all([probe(ytdlpPath(), ["--version"]), probe(ffmpegPath(), ["-version"])]);
  engineCache = { at: Date.now(), status: { ytdlp, ffmpeg: ffmpeg !== null } };
  return engineCache.status;
}

function baseArgs() {
  // Instagram often refuses anonymous server requests; an operator-supplied cookies file helps. Visitors never log in.
  const cookies = process.env.YTDLP_COOKIES_FILE ? ["--cookies", process.env.YTDLP_COOKIES_FILE] : [];
  return [
    ...cookies,
    "--ignore-config",
    "--no-progress",
    "--no-warnings",
    "--socket-timeout",
    "20",
    // YouTube needs a JS runtime to solve its player challenge; reuse the Node running this server.
    "--js-runtimes",
    `node:${process.execPath}`,
    "--ffmpeg-location",
    ffmpegPath(),
  ];
}

const MAX_JOBS = envNumber("MAX_CONCURRENT_JOBS", 3);
let running = 0;
const queue: Array<() => void> = [];

async function acquire() {
  if (running < MAX_JOBS) {
    running++;
    return;
  }
  await new Promise<void>((resolve) => queue.push(resolve));
  running++;
}

function release() {
  running--;
  queue.shift()?.();
}

export function mapYtdlpError(stderr: string): AppError {
  const text = stderr.toLowerCase();
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

interface RunOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

/** Runs yt-dlp without a shell, so the user-supplied URL is never parsed as a command. */
export async function runYtdlp(args: string[], { signal, timeoutMs = 120_000 }: RunOptions = {}) {
  await acquire();
  try {
    return await new Promise<string>((resolve, reject) => {
      const child = spawn(ytdlpPath(), [...baseArgs(), ...args], { windowsHide: true });
      const out: Buffer[] = [];
      let err = "";

      const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
      const onAbort = () => child.kill("SIGKILL");
      signal?.addEventListener("abort", onAbort, { once: true });

      child.stdout.on("data", (chunk: Buffer) => out.push(chunk));
      child.stderr.on("data", (chunk: Buffer) => {
        err = (err + chunk.toString()).slice(-8000);
      });

      child.on("error", (error: NodeJS.ErrnoException) => {
        clearTimeout(timer);
        reject(error.code === "ENOENT" ? new AppError("ENGINE_MISSING") : error);
      });

      child.on("close", (code) => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        if (code === 0) return resolve(Buffer.concat(out).toString("utf8"));
        if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
        if (err) console.warn("[weelink] yt-dlp:", err.trim().split("\n").slice(-3).join(" | "));
        reject(mapYtdlpError(err));
      });
    });
  } finally {
    release();
  }
}
