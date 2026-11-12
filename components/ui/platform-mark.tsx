import {
  siFacebook,
  siInstagram,
  siPinterest,
  siReddit,
  siSoundcloud,
  siThreads,
  siTiktok,
  siVimeo,
  siX,
  siYoutube,
  type SimpleIcon,
} from "simple-icons";
import type { PlatformId } from "@/lib/platforms";
import { LinkIcon } from "./icons";

const MARKS: Record<Exclude<PlatformId, "other">, SimpleIcon> = {
  instagram: siInstagram,
  tiktok: siTiktok,
  threads: siThreads,
  youtube: siYoutube,
  x: siX,
  facebook: siFacebook,
  pinterest: siPinterest,
  reddit: siReddit,
  vimeo: siVimeo,
  soundcloud: siSoundcloud,
};

interface PlatformMarkProps {
  id: PlatformId;
  size?: number;
  className?: string;
}

/** Drawn in the ink color, not brand colors, so ten logos don't turn into ten accents. */
export function PlatformMark({ id, size = 20, className }: PlatformMarkProps) {
  if (id === "other") return <LinkIcon size={size} className={className} />;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" className={className}>
      <path d={MARKS[id].path} />
    </svg>
  );
}
