import { createLocalStore } from "./local-store";
import { PLATFORMS, type PlatformId } from "./platforms";
import type { MediaInfo } from "./types";

export interface HistoryItem {
  /** Source link; also the identity of the item. */
  url: string;
  platform: PlatformId;
  title: string;
  author?: string;
  /** When the link was last read. */
  at: number;
  /** Label of the last file saved from this link, e.g. "720p" or "MP3 320 kbps". */
  savedLabel?: string;
}

const MAX_ITEMS = 60;
const PLATFORM_IDS = new Set<string>([...PLATFORMS.map((p) => p.id), "other"]);

function parseItems(raw: unknown): HistoryItem[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.filter(
    (item): item is HistoryItem =>
      typeof item === "object" &&
      item !== null &&
      typeof item.url === "string" &&
      typeof item.title === "string" &&
      typeof item.at === "number" &&
      PLATFORM_IDS.has(item.platform),
  );
}

export const historyStore = createLocalStore<HistoryItem[]>("weelink-history", [], parseItems);

export function recordResolved(media: MediaInfo) {
  const title = (media.title || media.entries[0]?.title || "Tanpa judul").trim();
  return historyStore.set((items) => {
    const previous = items.find((i) => i.url === media.sourceUrl);
    const item: HistoryItem = {
      url: media.sourceUrl,
      platform: media.platform,
      title,
      author: media.author,
      at: Date.now(),
      savedLabel: previous?.savedLabel,
    };
    return [item, ...items.filter((i) => i.url !== media.sourceUrl)].slice(0, MAX_ITEMS);
  });
}

export function recordSaved(url: string, label: string) {
  historyStore.set((items) => items.map((i) => (i.url === url ? { ...i, savedLabel: label } : i)));
}

export function removeHistory(url: string) {
  historyStore.set((items) => items.filter((i) => i.url !== url));
}

/** Puts a removed item back where its timestamp belongs, for the undo action. */
export function restoreHistory(item: HistoryItem) {
  historyStore.set((items) =>
    [...items.filter((i) => i.url !== item.url), item].sort((a, b) => b.at - a.at).slice(0, MAX_ITEMS),
  );
}

export function clearHistory() {
  historyStore.set([]);
}

/** The Unduh screen reads ?url= on arrival, the same path the share sheet uses. */
export function reopenHref(url: string) {
  return `/?url=${encodeURIComponent(url)}`;
}
