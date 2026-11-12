# syntax=docker/dockerfile:1
ARG NODE_VERSION=22
ARG FFMPEG_VERSION=7.1.1

# ---------- Binaries ----------
# A static ffmpeg is ~135 MB; Debian's ffmpeg package pulls ~480 MB of desktop libraries.
FROM mwader/static-ffmpeg:${FFMPEG_VERSION} AS ffmpeg

FROM debian:bookworm-slim AS ytdlp
# Pin with --build-arg YTDLP_VERSION=2026.10.26 for reproducible images; "latest" follows the newest release.
ARG YTDLP_VERSION=latest
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*
# The standalone build bundles its own Python, so the runtime image needs no Python.
RUN set -eux; \
  case "$(dpkg --print-architecture)" in \
    amd64) asset=yt-dlp_linux ;; \
    arm64) asset=yt-dlp_linux_aarch64 ;; \
    *) echo "Arsitektur tidak didukung yt-dlp standalone" >&2; exit 1 ;; \
  esac; \
  if [ "$YTDLP_VERSION" = "latest" ]; then \
    url="https://github.com/yt-dlp/yt-dlp/releases/latest/download/$asset"; \
  else \
    url="https://github.com/yt-dlp/yt-dlp/releases/download/$YTDLP_VERSION/$asset"; \
  fi; \
  curl -fsSL "$url" -o /yt-dlp; \
  chmod 755 /yt-dlp

# ---------- App ----------
FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Install scripts are skipped: ffmpeg comes from the static image, and Playwright's browser is only for docs.
RUN npm ci --ignore-scripts

# Headless Chromium for Threads, whose media only appears after its JavaScript runs.
# Downloaded with the app's own playwright-core CLI so the browser build always matches the library.
FROM node:${NODE_VERSION}-bookworm-slim AS browser
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
COPY --from=deps /app/node_modules/playwright-core /pw
RUN node /pw/cli.js install --only-shell chromium \
  && rm -rf /ms-playwright/ffmpeg-*

FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_OUTPUT_STANDALONE=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- Runtime ----------
FROM node:${NODE_VERSION}-bookworm-slim AS runner

# Chromium's shared libraries only: Playwright's own list for Debian 12, without the xvfb and
# font packages `--with-deps` adds (about 330 MB) that a page we only read never needs.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    tini ca-certificates \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libatspi2.0-0 libcairo2 libcups2 libdbus-1-3 \
    libdrm2 libgbm1 libglib2.0-0 libnspr4 libnss3 libpango-1.0-0 libx11-6 libxcb1 \
    libxcomposite1 libxdamage1 libxext6 libxfixes3 libxkbcommon0 libxrandr2 \
    libfontconfig1 libfreetype6 \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /opt/yt-dlp \
  && chown node:node /opt/yt-dlp

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
COPY --from=browser /ms-playwright /ms-playwright

COPY --from=ffmpeg /ffmpeg /usr/local/bin/ffmpeg
# Owned by the app user so `yt-dlp -U` in the entrypoint can replace it.
COPY --from=ytdlp --chown=node:node /yt-dlp /opt/yt-dlp/yt-dlp
# Also on PATH, so a platform that passes YTDLP_PATH="" (e.g. a pasted .env) still finds it.
RUN ln -s /opt/yt-dlp/yt-dlp /usr/local/bin/yt-dlp

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    YTDLP_PATH=/opt/yt-dlp/yt-dlp \
    FFMPEG_PATH=/usr/local/bin/ffmpeg \
    YTDLP_AUTO_UPDATE=1 \
    THREADS_RENDER=1

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
# chmod in a RUN step instead of COPY --chmod, which older non-BuildKit builders reject.
COPY docker/entrypoint.sh /usr/local/bin/weelink-entrypoint
RUN chmod 755 /usr/local/bin/weelink-entrypoint

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=12s --start-period=40s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]

# tini forwards stop signals so in-flight yt-dlp processes are reaped instead of left as zombies.
ENTRYPOINT ["/usr/bin/tini", "--", "weelink-entrypoint"]
CMD ["node", "server.js"]
