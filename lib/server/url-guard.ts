import { isIP } from "node:net";
import { AppError } from "./errors";

const MAX_URL_LENGTH = 2048;

function isPrivateIPv4(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isPrivateIPv6(ip: string) {
  const v = ip.toLowerCase();
  return v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("::ffff:");
}

/**
 * yt-dlp's generic extractor will fetch any URL, so reject loopback and private
 * hosts to keep the server from being used to probe its own network.
 * DNS names that resolve to private IPs are not caught here.
 */
export function assertPublicUrl(raw: string): URL {
  if (raw.length > MAX_URL_LENGTH) throw new AppError("INVALID_URL");

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new AppError("INVALID_URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new AppError("INVALID_URL");
  if (url.username || url.password) throw new AppError("BLOCKED_URL");

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const ipVersion = isIP(host);
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    (ipVersion === 4 && isPrivateIPv4(host)) ||
    (ipVersion === 6 && isPrivateIPv6(host))
  ) {
    throw new AppError("BLOCKED_URL");
  }
  if (!ipVersion && !host.includes(".")) throw new AppError("INVALID_URL");

  return url;
}
