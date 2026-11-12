import type { NextRequest } from "next/server";
import { contentDisposition, prepareFile } from "@/lib/server/download";
import { errorResponse } from "@/lib/server/errors";
import { envNumber } from "@/lib/server/env";
import { rateLimit } from "@/lib/server/rate-limit";
import { readTicket } from "@/lib/server/token";

export async function GET(request: NextRequest) {
  try {
    const ticket = readTicket(request.nextUrl.searchParams.get("t"));
    const inline = request.nextUrl.searchParams.get("inline") === "1";

    // Previews are small thumbnails shown on every result, so only real downloads count.
    if (!inline) rateLimit(request, "download", envNumber("DOWNLOAD_LIMIT_PER_10_MIN", 30));

    const file = await prepareFile(ticket, request.signal);
    const headers = new Headers({
      "content-type": file.contentType,
      "content-disposition": contentDisposition(file.filename, inline),
      "cache-control": inline ? "private, max-age=3600" : "no-store",
      "x-content-type-options": "nosniff",
    });
    if (file.size) {
      headers.set("content-length", String(file.size));
      // Some proxies drop content-length on streamed bodies; the client reads this for progress.
      headers.set("x-file-size", String(file.size));
    }

    return new Response(file.body, { headers });
  } catch (error) {
    return errorResponse(error);
  }
}
