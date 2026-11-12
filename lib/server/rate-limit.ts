import { AppError } from "./errors";

interface Bucket {
  hits: number[];
}

const WINDOW_MS = 10 * 60 * 1000;
const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}

/** In-memory sliding window per IP. Resets on restart, which is acceptable without a database. */
export function rateLimit(request: Request, scope: string, limit: number) {
  const now = Date.now();
  const key = `${scope}:${clientKey(request)}`;
  const bucket = buckets.get(key) ?? { hits: [] };

  bucket.hits = bucket.hits.filter((t) => now - t < WINDOW_MS);
  if (bucket.hits.length >= limit) throw new AppError("RATE_LIMITED");
  bucket.hits.push(now);
  buckets.set(key, bucket);

  if (now - lastSweep > WINDOW_MS) {
    lastSweep = now;
    for (const [k, b] of buckets) if (b.hits.every((t) => now - t >= WINDOW_MS)) buckets.delete(k);
  }
}
