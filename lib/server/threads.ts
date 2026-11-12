import { chromium, type Browser } from "playwright-core";
import type { DownloadOption, MediaEntry, MediaInfo } from "@/lib/types";
import { clip, ladderLabel, safeFilename } from "./normalize";
import { withJobSlot } from "./process";
import { issueTicket } from "./token";
import { assertPublicUrl } from "./url-guard";

/*
 * Threads has no yt-dlp extractor and hands a plain HTTP request only an app shell; the post's
 * media is attached by Threads' own JavaScript. So a public post is opened in headless Chromium
 * exactly as a logged-out visitor would see it (default user agent, no cookies), and the media
 * URLs are read from the rendered post. The files themselves are then fetched from Meta's CDN.
 */

interface RawItem {
  kind: "video" | "image";
  src: string;
  poster?: string;
  width?: number;
  height?: number;
}

const MEDIA_HOST = /(^|\.)(fbcdn\.net|cdninstagram\.com)$/;
const MP3_BITRATES = [320, 192, 128];
const IDLE_CLOSE_MS = 2 * 60_000;

// One browser per process, reused across requests and closed after two idle minutes to free RAM.
const holder = globalThis as typeof globalThis & {
  __weelinkBrowser?: Promise<Browser>;
  __weelinkBrowserIdle?: NodeJS.Timeout;
};

function getBrowser() {
  clearTimeout(holder.__weelinkBrowserIdle);
  holder.__weelinkBrowser ??= chromium
    // Docker's default 64 MB /dev/shm is too small for Chromium; use /tmp instead.
    .launch({ args: ["--disable-dev-shm-usage"] })
    .then((browser) => {
      browser.on("disconnected", () => (holder.__weelinkBrowser = undefined));
      return browser;
    })
    .catch((error) => {
      holder.__weelinkBrowser = undefined;
      throw error;
    });
  return holder.__weelinkBrowser;
}

function scheduleIdleClose() {
  clearTimeout(holder.__weelinkBrowserIdle);
  holder.__weelinkBrowserIdle = setTimeout(async () => {
    const pending = holder.__weelinkBrowser;
    holder.__weelinkBrowser = undefined;
    const browser = await pending?.catch(() => null);
    await browser?.close().catch(() => {});
  }, IDLE_CLOSE_MS);
}

/** Runs inside the page. The first pressable container is the opened post; the rest are replies. */
function collectPostMedia(): { title: string; items: RawItem[] } {
  const post = document.querySelector("[data-pressable-container]");
  if (!post) return { title: document.title, items: [] };

  const fromCdn = (url: string) => /fbcdn\.net|cdninstagram\.com/.test(url);
  const largest = (img: HTMLImageElement) => {
    const candidates = (img.srcset || "")
      .split(",")
      .map((part) => part.trim().split(/\s+/))
      .filter(([url]) => url)
      .map(([url, size]) => ({ url, w: parseInt(size ?? "", 10) || 0 }))
      .sort((a, b) => b.w - a.w);
    return candidates[0]?.url || img.currentSrc || img.src;
  };

  const photos = [...post.querySelectorAll("img")].filter(
    (img) =>
      fromCdn(img.currentSrc || img.src) &&
      !/profile picture/i.test(img.alt) &&
      Math.max(img.naturalWidth, img.width) >= 200,
  );

  // A video's thumbnail is the first photo in the smallest wrapper around it, but only when that
  // wrapper holds no other video; otherwise a carousel could hand one video another's thumbnail.
  const posters = new Map<HTMLVideoElement, HTMLImageElement>();
  const used = new Set<HTMLImageElement>();
  for (const video of post.querySelectorAll("video")) {
    for (let el = video.parentElement; el && el !== post; el = el.parentElement) {
      const match = photos.find((img) => !used.has(img) && el.contains(img));
      if (!match) continue;
      if (el.querySelectorAll("video").length === 1) {
        posters.set(video, match);
        used.add(match);
      }
      break;
    }
  }

  const items: RawItem[] = [];
  for (const node of post.querySelectorAll("video, img")) {
    if (node instanceof HTMLVideoElement) {
      const src = node.currentSrc || node.src || node.querySelector("source")?.src || "";
      const poster = posters.get(node);
      if (fromCdn(src) && !src.startsWith("blob:")) {
        items.push({ kind: "video", src, poster: poster ? largest(poster) : undefined, width: node.videoWidth, height: node.videoHeight });
      } else if (poster) {
        // Streamed (blob:) videos can't be fetched; the thumbnail is still worth offering.
        items.push({ kind: "image", src: largest(poster), width: poster.naturalWidth, height: poster.naturalHeight });
      }
    } else if (node instanceof HTMLImageElement && photos.includes(node) && !used.has(node)) {
      items.push({ kind: "image", src: largest(node), width: node.naturalWidth, height: node.naturalHeight });
    }
  }
  return { title: document.title, items };
}

async function renderPost(url: string, signal?: AbortSignal) {
  const browser = await getBrowser();
  // en-US keeps the "profile picture" alt text the filter above relies on.
  const context = await browser.newContext({ locale: "en-US", viewport: { width: 430, height: 932 } });
  const onAbort = () => void context.close().catch(() => {});
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const page = await context.newPage();
    await page.route("**/*", (route) => (route.request().resourceType() === "font" ? route.abort() : route.continue()));
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForSelector("[data-pressable-container]", { timeout: 15_000 });
    // Wait until the post's media is attached: a video with a source or a full-size photo.
    await page
      .waitForFunction(
        () => {
          const post = document.querySelector("[data-pressable-container]");
          if (!post) return false;
          const video = [...post.querySelectorAll("video")].some((v) => (v.currentSrc || v.src) && v.readyState >= 1);
          const photo = [...post.querySelectorAll("img")].some((img) => img.complete && img.naturalWidth >= 200 && !/profile picture/i.test(img.alt));
          return video || photo;
        },
        null,
        { timeout: 12_000 },
      )
      .catch(() => {});
    return await page.evaluate(collectPostMedia);
  } finally {
    signal?.removeEventListener("abort", onAbort);
    await context.close().catch(() => {});
    scheduleIdleClose();
  }
}

function cdnUrl(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = assertPublicUrl(value);
    return MEDIA_HOST.test(url.hostname) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function previewUrl(sourceUrl: string, image: string | undefined) {
  if (!image) return undefined;
  return `/api/download?t=${issueTicket({ u: sourceUrl, m: "image", s: image, n: "preview" })}&inline=1`;
}

function toEntry(item: RawItem, index: number, count: number, sourceUrl: string, title: string, fileBase: string): MediaEntry | null {
  const src = cdnUrl(item.src);
  if (!src) return null;
  const poster = cdnUrl(item.poster);
  const n = count > 1 ? `${fileBase} (${index + 1})` : fileBase;
  const options: DownloadOption[] = [];

  if (item.kind === "video") {
    const side = item.width && item.height ? Math.min(item.width, item.height) : 0;
    options.push({
      id: "video-src",
      mode: "video",
      value: side ? String(ladderLabel(side)) : "Asli",
      unit: side ? "p" : undefined,
      token: issueTicket({ u: sourceUrl, m: "video", s: src, n }),
    });
    for (const kbps of MP3_BITRATES) {
      options.push({ id: `audio-${kbps}`, mode: "audio", value: String(kbps), unit: "kbps", token: issueTicket({ u: sourceUrl, m: "audio", s: src, q: kbps, n }) });
    }
    if (poster) options.push({ id: "image-cover", mode: "image", value: "Sampul", token: issueTicket({ u: sourceUrl, m: "image", s: poster, n }) });
  } else {
    options.push({ id: "image-src", mode: "image", value: "Asli", token: issueTicket({ u: sourceUrl, m: "image", s: src, n }) });
  }

  return {
    id: `threads-${index}`,
    title,
    previewUrl: previewUrl(sourceUrl, item.kind === "video" ? poster : src),
    width: item.width || undefined,
    height: item.height || undefined,
    options,
  };
}

/** Null when rendering is disabled, the browser is missing, or the post shows no media. */
export async function resolveThreads(url: string, signal?: AbortSignal): Promise<MediaInfo | null> {
  if (process.env.THREADS_RENDER === "0") return null;

  let rendered: Awaited<ReturnType<typeof renderPost>>;
  try {
    rendered = await withJobSlot(() => renderPost(url, signal));
  } catch (error) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    console.warn("[weelink] threads:", error instanceof Error ? error.message.split("\n")[0] : error);
    return null;
  }

  const author = new URL(url).pathname.match(/^\/@([\w.]+)/)?.[1];
  const rawTitle = rendered.title && rendered.title !== "Threads" ? rendered.title : `Postingan Threads${author ? ` @${author}` : ""}`;
  const title = clip(rawTitle, 140);
  const fileBase = safeFilename(`${title} - Threads`, "weelink-threads");

  const entries = rendered.items
    .map((item, i) => toEntry(item, i, rendered.items.length, url, title, fileBase))
    .filter((entry): entry is MediaEntry => entry !== null);

  console.info(`[weelink] threads: ${entries.length} media dari postingan`);
  return entries.length ? { platform: "threads", sourceUrl: url, title, author, entries } : null;
}
