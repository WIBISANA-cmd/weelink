import { connection } from "next/server";
import { engineStatus } from "@/lib/server/ytdlp";

export async function GET() {
  // Without this the handler would be prerendered at build time and always report the build machine.
  await connection();

  const engine = await engineStatus();
  const ok = Boolean(engine.ytdlp) && engine.ffmpeg;
  return Response.json(
    { status: ok ? "ok" : "degraded", ytdlp: engine.ytdlp, ffmpeg: engine.ffmpeg },
    { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
