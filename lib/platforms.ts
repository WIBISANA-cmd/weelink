export type PlatformId =
  | "instagram"
  | "tiktok"
  | "threads"
  | "youtube"
  | "x"
  | "facebook"
  | "pinterest"
  | "reddit"
  | "vimeo"
  | "soundcloud"
  | "other";

export interface Platform {
  id: PlatformId;
  name: string;
  hosts: string[];
}

export const PLATFORMS: Platform[] = [
  { id: "instagram", name: "Instagram", hosts: ["instagram.com", "instagr.am"] },
  { id: "tiktok", name: "TikTok", hosts: ["tiktok.com"] },
  { id: "threads", name: "Threads", hosts: ["threads.net", "threads.com"] },
  { id: "youtube", name: "YouTube", hosts: ["youtube.com", "youtu.be"] },
  { id: "x", name: "X", hosts: ["x.com", "twitter.com"] },
  { id: "facebook", name: "Facebook", hosts: ["facebook.com", "fb.watch", "fb.com"] },
  { id: "pinterest", name: "Pinterest", hosts: ["pinterest.com", "pin.it"] },
  { id: "reddit", name: "Reddit", hosts: ["reddit.com", "redd.it"] },
  { id: "vimeo", name: "Vimeo", hosts: ["vimeo.com"] },
  { id: "soundcloud", name: "SoundCloud", hosts: ["soundcloud.com"] },
];

const OTHER: Platform = { id: "other", name: "situs lain", hosts: [] };

function hostMatches(hostname: string, host: string) {
  return hostname === host || hostname.endsWith(`.${host}`);
}

/** Share sheets often paste "caption text https://...", so pull the first URL out of the text. */
export function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"']+/i);
  if (match) return match[0].replace(/[),.;!?]+$/, "");

  const bare = text.trim();
  if (/^[\w-]+(\.[\w-]+)+\/\S*$/.test(bare)) return `https://${bare}`;
  return null;
}

export function detectPlatform(url: string): Platform | null {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  return PLATFORMS.find((p) => p.hosts.some((h) => hostMatches(hostname, h))) ?? OTHER;
}
