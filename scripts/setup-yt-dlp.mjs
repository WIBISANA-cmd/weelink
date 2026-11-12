// Downloads the official standalone yt-dlp build for this OS into ./bin.
// Standalone builds bundle their own Python, so no Python install is needed.
import { createWriteStream } from "node:fs";
import { chmod, mkdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const RELEASE = "https://github.com/yt-dlp/yt-dlp/releases/latest/download";

function assetName() {
  const { platform, arch } = process;
  if (platform === "win32") return "yt-dlp.exe";
  if (platform === "darwin") return "yt-dlp_macos";
  if (platform === "linux") return arch === "arm64" ? "yt-dlp_linux_aarch64" : "yt-dlp_linux";
  throw new Error(`Platform ${platform}/${arch} tidak punya build standalone. Pasang yt-dlp manual lalu isi YTDLP_PATH.`);
}

async function main() {
  const asset = assetName();
  const binDir = join(process.cwd(), "bin");
  const target = join(binDir, process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp");
  const partial = `${target}.download`;

  await mkdir(binDir, { recursive: true });
  console.log(`Mengunduh ${asset} ...`);

  const res = await fetch(`${RELEASE}/${asset}`, { redirect: "follow" });
  if (!res.ok || !res.body) throw new Error(`Gagal mengunduh (${res.status} ${res.statusText})`);

  try {
    await pipeline(Readable.fromWeb(res.body), createWriteStream(partial));
    await rename(partial, target);
  } catch (error) {
    await rm(partial, { force: true });
    throw error;
  }

  if (process.platform !== "win32") await chmod(target, 0o755);
  console.log(`yt-dlp siap di ${target}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
