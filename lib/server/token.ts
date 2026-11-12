import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { MediaMode } from "@/lib/types";
import { AppError } from "./errors";

/**
 * Download options travel to the browser as signed tokens instead of rows in a
 * database. The server can trust a token's contents because only it holds the key.
 */
export interface DownloadTicket {
  /** Source post URL. */
  u: string;
  m: MediaMode;
  /** Max short-side pixels for video, kbps for audio. */
  q?: number;
  /** 1-based item index inside a carousel or playlist. */
  i?: number;
  /** Direct file URL when the media is fetched without yt-dlp. */
  s?: string;
  /** Filename without extension. */
  n: string;
  /** Expiry, unix seconds. */
  e: number;
}

const TTL_SECONDS = 60 * 60;

const globalKey = globalThis as typeof globalThis & { __weelinkSecret?: Buffer };

// Route handlers are bundled separately, so a module-level random key would differ
// between /api/resolve and /api/download. globalThis is shared within the process.
function secret(): Buffer {
  if (process.env.WEELINK_SECRET) return Buffer.from(process.env.WEELINK_SECRET);
  globalKey.__weelinkSecret ??= randomBytes(32);
  return globalKey.__weelinkSecret;
}

function sign(body: string) {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

export type TicketInput = Omit<DownloadTicket, "e">;

export function issueTicket(ticket: TicketInput): string {
  const full: DownloadTicket = { ...ticket, e: Math.floor(Date.now() / 1000) + TTL_SECONDS };
  const body = Buffer.from(JSON.stringify(full)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readTicket(token: string | null): DownloadTicket {
  const [body, mac] = (token ?? "").split(".");
  if (!body || !mac) throw new AppError("TOKEN_EXPIRED");

  const expected = Buffer.from(sign(body));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    throw new AppError("TOKEN_EXPIRED");
  }

  const ticket = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as DownloadTicket;
  if (ticket.e < Date.now() / 1000) throw new AppError("TOKEN_EXPIRED");
  return ticket;
}
