import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The Docker build sets this to ship a minimal server.js; local `npm start` keeps the regular output.
  output: process.env.NEXT_OUTPUT_STANDALONE === "1" ? "standalone" : undefined,
  // Both resolve files relative to their own folder at runtime, which bundling would break.
  serverExternalPackages: ["ffmpeg-static", "playwright-core"],
  // playwright-core loads parts of itself dynamically, so file tracing alone misses some of it.
  outputFileTracingIncludes: {
    "/api/resolve": ["./node_modules/playwright-core/**/*"],
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
