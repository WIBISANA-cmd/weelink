import type { PlatformId } from "@/lib/platforms";
import type { DownloadOption, MediaEntry, MediaInfo } from "@/lib/types";
import { issueTicket, type TicketInput } from "./token";

type TicketBase = Omit<TicketInput, "m">;

interface YtThumbnail {
  url: string;
  width?: number;
  height?: number;
}

interface YtFormat {
  format_id: string;
  ext?: string;
  vcodec?: string | null;
  acodec?: string | null;
  width?: number | null;
  height?: number | null;
  filesize?: number | null;
  filesize_approx?: number | null;
}

export interface YtInfo {
  _type?: string;
  id: string;
  title?: string;
  description?: string;
  uploader?: string;
  channel?: string;
  creator?: string;
  duration?: number;
  thumbnail?: string;
  thumbnails?: YtThumbnail[];
  formats?: YtFormat[];
  url?: string;
  ext?: string;
  width?: number;
  height?: number;
  entries?: Array<YtInfo | null>;
}

const LADDER = [144, 240, 360, 480, 540, 720, 1080, 1440, 2160, 4320];
const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "heic", "avif", "gif"]);
const MP3_BITRATES = [320, 192, 128];
const MAX_VIDEO_KEYS = 6;

/** Portrait clips report height 1024 for what platforms call 540p, so label by the short side. */
export function ladderLabel(shortSide: number) {
  return LADDER.reduce((best, step) => (Math.abs(step - shortSide) < Math.abs(best - shortSide) ? step : best));
}

const isVideo = (f: YtFormat) => Boolean(f.vcodec) && f.vcodec !== "none";
const hasAudioTrack = (f: YtFormat) => Boolean(f.acodec) && f.acodec !== "none";
const sizeOf = (f: YtFormat) => f.filesize ?? f.filesize_approx ?? undefined;

function shortSide(f: { width?: number | null; height?: number | null }) {
  if (f.width && f.height) return Math.min(f.width, f.height);
  return f.height ?? f.width ?? 0;
}

/** Cuts by code point: slicing UTF-16 can split an emoji, and a lone surrogate breaks encodeURIComponent. */
export function clip(text: string, max: number) {
  const chars = Array.from(text);
  return chars.length > max ? `${chars.slice(0, max - 3).join("")}...` : text;
}

export function safeFilename(name: string, fallback: string) {
  const cleaned = Array.from(
    name
      .replace(/[\u0000-\u001f\u007f<>:"/\\|?*#]+/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  )
    .slice(0, 80)
    .join("")
    .trim();
  return cleaned || fallback;
}

function titleOf(info: YtInfo, platformName: string) {
  return clip(info.title || info.description?.split("\n")[0] || `Postingan ${platformName}`, 140);
}

function previewUrl(sourceUrl: string, image: string | undefined) {
  if (!image) return undefined;
  const token = issueTicket({ u: sourceUrl, m: "image", s: image, n: "preview" });
  return `/api/download?t=${token}&inline=1`;
}

function videoOptions(formats: YtFormat[], base: TicketBase) {
  const video = formats.filter(isVideo);
  if (video.length === 0) return [];

  const bestAudio = Math.max(0, ...formats.filter((f) => !isVideo(f) && hasAudioTrack(f)).map((f) => sizeOf(f) ?? 0));
  const groups = new Map<number, { max: number; size?: number }>();

  for (const f of video) {
    const side = shortSide(f);
    if (!side) continue;
    const label = ladderLabel(side);
    const group = groups.get(label) ?? { max: 0 };
    group.max = Math.max(group.max, side);

    const size = sizeOf(f);
    // yt-dlp picks the best stream at a resolution, which is usually the largest one.
    if (size !== undefined) group.size = Math.max(group.size ?? 0, size + (hasAudioTrack(f) ? 0 : bestAudio));
    groups.set(label, group);
  }

  if (groups.size === 0) {
    return [{ id: "video-src", mode: "video", value: "Asli", token: issueTicket({ ...base, m: "video" }) } satisfies DownloadOption];
  }

  return [...groups.entries()]
    .sort(([a], [b]) => b - a)
    .slice(0, MAX_VIDEO_KEYS)
    .map(([label, g]): DownloadOption => ({
      id: `video-${label}`,
      mode: "video",
      value: String(label),
      unit: "p",
      sizeBytes: g.size,
      token: issueTicket({ ...base, m: "video", q: g.max }),
    }));
}

function audioOptions(formats: YtFormat[], duration: number | undefined, base: TicketBase) {
  const mayHaveAudio = formats.some((f) => hasAudioTrack(f) || f.acodec === undefined || f.acodec === null);
  if (!mayHaveAudio) return [];

  return MP3_BITRATES.map(
    (kbps): DownloadOption => ({
      id: `audio-${kbps}`,
      mode: "audio",
      value: String(kbps),
      unit: "kbps",
      sizeBytes: duration ? Math.round((duration * kbps * 1000) / 8) : undefined,
      token: issueTicket({ ...base, m: "audio", q: kbps }),
    }),
  );
}

function bestThumbnail(info: YtInfo) {
  if (info.thumbnail) return info.thumbnail;
  const sized = [...(info.thumbnails ?? [])].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  return sized[0]?.url;
}

function toEntry(info: YtInfo, sourceUrl: string, index: number | undefined, fileBase: string, platformName: string): MediaEntry {
  const formats = info.formats ?? [];
  const isImage = formats.length === 0 && Boolean(info.url) && IMAGE_EXT.has((info.ext ?? "").toLowerCase());
  const name = index ? `${fileBase} (${index})` : fileBase;
  const base = { u: sourceUrl, i: index, n: name };
  const cover = bestThumbnail(info);

  const options: DownloadOption[] = isImage
    ? [{ id: "image-src", mode: "image", value: "Asli", token: issueTicket({ ...base, m: "image", s: info.url }) }]
    : [...videoOptions(formats, base), ...audioOptions(formats, info.duration, base)];

  if (!isImage && cover) {
    options.push({ id: "image-cover", mode: "image", value: "Sampul", token: issueTicket({ ...base, m: "image", s: cover }) });
  }

  const best = formats.filter(isVideo).sort((a, b) => shortSide(b) - shortSide(a))[0];

  return {
    id: `${info.id}-${index ?? 0}`,
    title: titleOf(info, platformName),
    previewUrl: previewUrl(sourceUrl, isImage ? info.url : cover),
    width: info.width ?? best?.width ?? undefined,
    height: info.height ?? best?.height ?? undefined,
    durationSec: info.duration,
    options,
  };
}

export function normalize(info: YtInfo, sourceUrl: string, platform: PlatformId, platformName: string): MediaInfo {
  const title = titleOf(info, platformName);
  const fileBase = safeFilename(`${title} - ${platformName}`, `weelink-${info.id}`);
  const author = info.uploader ?? info.channel ?? info.creator;

  const items = info._type === "playlist" && info.entries ? info.entries : [info];
  const entries = items
    .map((item, i) => (item ? toEntry(item, sourceUrl, items.length > 1 ? i + 1 : undefined, fileBase, platformName) : null))
    .filter((e): e is MediaEntry => e !== null && e.options.length > 0);

  return { platform, sourceUrl, title, author, entries };
}
