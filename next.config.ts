import type { NextConfig } from "next";
import pkg from "./package.json" with { type: "json" };

// One ID per build. The service worker reads it (app/sw-version.js) to spot a new deploy;
// set WEELINK_BUILD_ID (for example to the git commit) for reproducible images.
const buildId = process.env.WEELINK_BUILD_ID || new Date().toISOString().replace(/\D/g, "").slice(0, 12);

const noCache = [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The Docker build sets this to ship a minimal server.js; local `npm start` keeps the regular output.
  output: process.env.NEXT_OUTPUT_STANDALONE === "1" ? "standalone" : undefined,
  env: {
    NEXT_PUBLIC_BUILD_ID: buildId,
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  // Both resolve files relative to their own folder at runtime, which bundling would break.
  serverExternalPackages: ["ffmpeg-static", "playwright-core"],
  // playwright-core loads parts of itself dynamically, so file tracing alone misses some of it.
  outputFileTracingIncludes: {
    "/api/resolve": ["./node_modules/playwright-core/**/*"],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [...noCache, { key: "Service-Worker-Allowed", value: "/" }],
      },
      { source: "/sw-version.js", headers: noCache },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
