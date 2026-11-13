import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
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

/**
 * YouTube and Instagram often refuse anonymous requests from server IPs; an operator-supplied cookies
 * file helps (visitors never log in). yt-dlp rewrites that file on exit and crashes when it can't,
 * which a read-only mount (Dokploy File Mounts) would cause, so every run gets its own writable copy.
 */
async function withCookies<T>(run: (cookieArgs: string[]) => Promise<T>): Promise<T> {
  const source = process.env.YTDLP_COOKIES_FILE;
  if (!source) return run([]);

  const copy = join(tmpdir(), `weelink-cookies-${randomUUID()}.txt`);
  try {
    // Read and write instead of copyFile, which would carry over the source's read-only mode.
    await writeFile(copy, await readFile(source), { mode: 0o600 });
  } catch (error) {
    console.warn(`[weelink] YTDLP_COOKIES_FILE tidak bisa dibaca (${source}):`, error instanceof Error ? error.message : error);
    return run([]);
  }
  try {
    return await run(["--cookies", copy]);
  } finally {
    await rm(copy, { force: true });
  }
}

function baseArgs() {
  // --ffmpeg-location needs a path; a bare "ffmpeg" makes yt-dlp report it missing.
  const ffmpeg = ffmpegPath();
  return [
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
  // A yt-dlp crash, not a platform answer; its file paths (e.g. ".../cookies.py") must not match the patterns below.
  if (text.includes("traceback (most recent call last)") || text.includes("failed to execute script")) {
    return new AppError("UPSTREAM");
  }
  // Checked first: "ffmpeg not found" would otherwise read as a missing post.
  if (/ffmpeg (and ffprobe )?not found|ffprobe and ffmpeg not found/.test(text)) return new AppError("ENGINE_MISSING");
  if (text.includes("unsupported url")) return new AppError("UNSUPPORTED");
  if (/no video (formats )?(found|in this post)|there is no video/.test(text)) return new AppError("NO_MEDIA");
  // YouTube's check on datacenter IPs. Nothing the visitor can fix, so say so; the operator gets a log hint.
  if (/confirm you.?re not a bot/.test(text)) {
    console.warn("[weelink] YouTube menolak IP server ini sebagai bot. Pasang cookies akun lewat YTDLP_COOKIES_FILE (lihat docs/deploy-docker.md, bagian YouTube).");
    return new AppError("REFUSED", "YouTube sedang menolak permintaan dari server WeeLink. Coba lagi beberapa saat lagi.");
  }
  if (/login|log in|sign in|--cookies|rate-limit/.test(text)) {
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
  const result = await withCookies((cookieArgs) => runQueued(ytdlpPath(), [...cookieArgs, ...baseArgs(), ...args], options));
  if (result.code === 0) return result.stdout;
  if (result.stderr) console.warn("[weelink] yt-dlp:", result.stderr.trim().split("\n").slice(-3).join(" | "));
  throw mapYtdlpError(result.stderr);
}
