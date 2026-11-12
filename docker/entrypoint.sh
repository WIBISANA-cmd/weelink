#!/bin/sh
set -e

# Platforms change often and an old yt-dlp is the most common cause of failed links,
# so refresh it on every start. A failed update keeps the version baked into the image.
if [ "${YTDLP_AUTO_UPDATE:-1}" = "1" ]; then
  echo "[weelink] memeriksa pembaruan yt-dlp..."
  "$YTDLP_PATH" -U || echo "[weelink] pembaruan yt-dlp gagal, memakai versi bawaan image"
fi

echo "[weelink] yt-dlp $("$YTDLP_PATH" --version), $(ffmpeg -version | head -n 1)"
exec "$@"
