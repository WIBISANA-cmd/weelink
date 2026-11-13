import { BUILD_ID } from "@/lib/pwa";

/**
 * Imported by public/sw.js. Browsers compare imported scripts byte for byte on every update check,
 * so a new build ID here is what tells an open app that a new version was deployed.
 */
export function GET() {
  return new Response(`self.WEELINK_VERSION=${JSON.stringify(BUILD_ID)};\n`, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-cache",
    },
  });
}
