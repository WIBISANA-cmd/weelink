import { extractUrl } from "@/lib/platforms";
import { AppError, errorResponse } from "@/lib/server/errors";
import { envNumber } from "@/lib/server/env";
import { rateLimit } from "@/lib/server/rate-limit";
import { resolveMedia } from "@/lib/server/resolve";

export async function POST(request: Request) {
  try {
    rateLimit(request, "resolve", envNumber("RESOLVE_LIMIT_PER_10_MIN", 30));

    const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
    const url = typeof body?.url === "string" ? extractUrl(body.url) : null;
    if (!url) throw new AppError("INVALID_URL");

    const media = await resolveMedia(url, request.signal);
    return Response.json(media, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
