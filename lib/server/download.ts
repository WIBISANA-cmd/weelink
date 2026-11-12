import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { AppError } from "./errors";
import { ensurePlayable } from "./media-compat";
import { BROWSER_UA } from "./og-fallback";
import type { DownloadTicket } from "./token";
import { assertPublicUrl } from "./url-guard";
import { runYtdlp } from "./ytdlp";

export interface PreparedFile {
  body: ReadableStream<Uint8Array>;
  size?: number;
  filename: string;
  contentType: string;
}

const TYPES: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  avif: "image/avif",
};

// Reverse map keeps the first extension per type, so image/jpeg becomes .jpg.
const EXT_BY_TYPE: Record<string, string> = {};
for (const [ext, type] of Object.entries(TYPES)) EXT_BY_TYPE[type] ??= ext;

async function fetchSource(ticket: DownloadTicket & { s: string }, signal: AbortSignal) {
  const url = assertPublicUrl(ticket.s);
  const res = await fetch(url, { headers: { "user-agent": BROWSER_UA }, redirect: "follow", signal });
  if (!res.ok || !res.body) throw new AppError(res.status === 404 ? "NOT_FOUND" : "UPSTREAM");

  const contentType = res.headers.get("content-type")?.split(";")[0].trim() ?? "application/octet-stream";
  // MP3 options for direct sources point at the video file; ffmpeg extracts the audio afterwards.
  const accepted = ticket.m === "image" ? ["image/"] : ticket.m === "video" ? ["video/"] : ["audio/", "video/"];
  if (!accepted.some((prefix) => contentType.startsWith(prefix))) throw new AppError("NO_MEDIA");

  const ext = EXT_BY_TYPE[contentType] ?? (extname(url.pathname).slice(1).toLowerCase() || "bin");
  return { res, body: res.body, contentType, ext };
}

/** Thumbnails for the result card: passed straight through, no temp file and no job slot. */
async function streamPreview(ticket: DownloadTicket & { s: string }, signal: AbortSignal): Promise<PreparedFile> {
  const { res, body, contentType, ext } = await fetchSource(ticket, signal);
  const size = Number(res.headers.get("content-length")) || undefined;
  return { body, size, filename: `${ticket.n}.${ext}`, contentType };
}

async function fetchToDir(ticket: DownloadTicket & { s: string }, dir: string, signal: AbortSignal) {
  const { body, ext } = await fetchSource(ticket, signal);
  const file = join(dir, `media.${ext}`);
  await pipeline(Readable.fromWeb(body as import("node:stream/web").ReadableStream), createWriteStream(file), { signal });
  return file;
}

function ytdlpArgs(ticket: DownloadTicket, outDir: string) {
  const args =
    ticket.m === "audio"
      ? ["-f", "ba/b", "-x", "--audio-format", "mp3", "--audio-quality", `${ticket.q ?? 320}K`]
      : // Prefer H.264 + AAC at the chosen resolution so most files need no re-encode afterwards.
        ["-f", "bv*+ba/b", "-S", `${ticket.q ? `res:${ticket.q},` : ""}vcodec:h264,acodec:m4a`, "--merge-output-format", "mp4"];

  const playlist = ticket.i ? ["--yes-playlist", "--playlist-items", String(ticket.i)] : ["--no-playlist"];
  return [...args, ...playlist, "-o", join(outDir, "media.%(ext)s"), "--", ticket.u];
}

async function extractToDir(ticket: DownloadTicket, dir: string, signal: AbortSignal) {
  const args = ytdlpArgs(ticket, dir);
  try {
    await runYtdlp(args, { signal, timeoutMs: 15 * 60_000 });
  } catch (error) {
    // YouTube's media servers intermittently answer 403 on the first attempt; a fresh run usually succeeds.
    if (!(error instanceof AppError && error.code === "UPSTREAM") || signal.aborted) throw error;
    await runYtdlp(args, { signal, timeoutMs: 15 * 60_000 });
  }

  const files = (await readdir(dir)).filter((f) => !f.endsWith(".part") && !f.endsWith(".ytdl"));
  const sized = await Promise.all(files.map(async (f) => ({ f, size: (await stat(join(dir, f))).size })));
  const largest = sized.sort((a, b) => b.size - a.size)[0];
  if (!largest) throw new AppError("NO_MEDIA");
  return join(dir, largest.f);
}

export async function prepareFile(ticket: DownloadTicket, signal: AbortSignal, inline = false): Promise<PreparedFile> {
  if (inline && ticket.s) return streamPreview({ ...ticket, s: ticket.s }, signal);

  const dir = await mkdtemp(join(tmpdir(), "weelink-"));
  const cleanup = () => rm(dir, { recursive: true, force: true }).catch(() => {});

  try {
    const raw = ticket.s ? await fetchToDir({ ...ticket, s: ticket.s }, dir, signal) : await extractToDir(ticket, dir, signal);
    const file = await ensurePlayable(raw, ticket.m, ticket.q, signal);
    const ext = extname(file).slice(1).toLowerCase();
    const { size } = await stat(file);

    const stream = createReadStream(file);
    // The temp folder only lives as long as the response that streams it.
    stream.once("close", cleanup);

    return {
      body: Readable.toWeb(stream) as ReadableStream<Uint8Array>,
      size,
      filename: `${ticket.n}.${ext}`,
      contentType: TYPES[ext] ?? "application/octet-stream",
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

export function contentDisposition(filename: string, inline: boolean) {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
  return `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
