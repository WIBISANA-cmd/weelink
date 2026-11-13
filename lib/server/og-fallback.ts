import type { PlatformId } from "@/lib/platforms";
import type { DownloadOption, MediaInfo } from "@/lib/types";
import { clip, safeFilename } from "./normalize";
import { issueTicket } from "./token";
import { assertPublicUrl } from "./url-guard";

export const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

const MAX_HTML_BYTES = 2 * 1024 * 1024;

function decodeEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function readMeta(html: string) {
  const meta = new Map<string, string>();
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const content = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1];
    if (key && content && !meta.has(key)) meta.set(key, decodeEntities(content));
  }
  return meta;
}

async function fetchHtml(url: string) {
  const res = await fetch(url, {
    headers: { "user-agent": BROWSER_UA, "accept-language": "id,en;q=0.8" },
    redirect: "follow",
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok || !res.body) return null;

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (received < MAX_HTML_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  return Buffer.concat(chunks).toString("utf8");
}

function publicOrNull(url: string | undefined) {
  if (!url) return undefined;
  try {
    return assertPublicUrl(url).toString();
  } catch {
    return undefined;
  }
}

/**
 * Photo posts on Threads and Instagram have no video for yt-dlp to find, but the
 * page still exposes the image through Open Graph tags.
 */
export async function resolveFromOpenGraph(sourceUrl: string, platform: PlatformId, platformName: string): Promise<MediaInfo | null> {
  const html = await fetchHtml(sourceUrl).catch(() => null);
  if (!html) return null;

  const meta = readMeta(html);
  const image = publicOrNull(meta.get("og:image") ?? meta.get("twitter:image"));
  // og:video is often an HTML player (YouTube's is an /embed/ page with og:video:type text/html), not a file.
  const videoType = meta.get("og:video:type");
  const video = !videoType || videoType.startsWith("video/") ? publicOrNull(meta.get("og:video:secure_url") ?? meta.get("og:video")) : undefined;
  if (!image && !video) return null;

  const title = clip(meta.get("og:title") ?? meta.get("og:description") ?? `Postingan ${platformName}`, 140);
  const n = safeFilename(`${title} - ${platformName}`, "weelink");
  const options: DownloadOption[] = [];

  if (video) options.push({ id: "video-src", mode: "video", value: "Asli", token: issueTicket({ u: sourceUrl, m: "video", s: video, n }) });
  if (image) options.push({ id: "image-src", mode: "image", value: video ? "Sampul" : "Asli", token: issueTicket({ u: sourceUrl, m: "image", s: image, n }) });

  const preview = image ? `/api/download?t=${issueTicket({ u: sourceUrl, m: "image", s: image, n: "preview" })}&inline=1` : undefined;
  const width = Number(meta.get("og:image:width")) || undefined;
  const height = Number(meta.get("og:image:height")) || undefined;

  return {
    platform,
    sourceUrl,
    title,
    author: meta.get("og:site_name") === platformName ? undefined : meta.get("og:site_name"),
    entries: [{ id: "og-0", title, previewUrl: preview, width, height, options }],
  };
}
