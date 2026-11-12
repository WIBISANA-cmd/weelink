"use client";

import { useSearchParams } from "next/navigation";
import { extractUrl } from "@/lib/platforms";
import { Downloader } from "./downloader";

/** Android's share sheet opens /?text=... once WeeLink is installed (see app/manifest.ts). */
export function SharedLinkDownloader() {
  const params = useSearchParams();
  const shared = extractUrl(params.get("url") ?? params.get("text") ?? "") ?? undefined;
  return <Downloader sharedUrl={shared} />;
}
