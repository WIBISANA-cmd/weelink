import { spawn } from "node:child_process";
import { envNumber } from "./env";
import { AppError } from "./errors";

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

/** Runs heavy work (a browser render) under the same limit as yt-dlp and ffmpeg processes. */
export async function withJobSlot<T>(task: () => Promise<T>): Promise<T> {
  await acquire();
  try {
    return await task();
  } finally {
    release();
  }
}

export interface RunResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

interface RunOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

/**
 * Runs a binary without a shell inside the shared job queue, so yt-dlp and ffmpeg
 * together never exceed MAX_CONCURRENT_JOBS. A non-zero exit resolves; callers decide what it means.
 */
export function runQueued(bin: string, args: string[], { signal, timeoutMs = 120_000 }: RunOptions = {}): Promise<RunResult> {
  return withJobSlot(
    () =>
      new Promise<RunResult>((resolve, reject) => {
        const child = spawn(bin, args, { windowsHide: true });
        const out: Buffer[] = [];
        let err = "";

        const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
        const onAbort = () => child.kill("SIGKILL");
        signal?.addEventListener("abort", onAbort, { once: true });

        child.stdout.on("data", (chunk: Buffer) => out.push(chunk));
        child.stderr.on("data", (chunk: Buffer) => {
          err = (err + chunk.toString()).slice(-16_000);
        });

        child.on("error", (error: NodeJS.ErrnoException) => {
          clearTimeout(timer);
          signal?.removeEventListener("abort", onAbort);
          reject(error.code === "ENOENT" ? new AppError("ENGINE_MISSING") : error);
        });

        child.on("close", (code) => {
          clearTimeout(timer);
          signal?.removeEventListener("abort", onAbort);
          if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
          resolve({ stdout: Buffer.concat(out).toString("utf8"), stderr: err, code });
        });
      }),
  );
}
