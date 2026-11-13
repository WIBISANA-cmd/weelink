"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { ApiErrorBody } from "@/lib/types";

export type DownloadState =
  | { status: "idle" }
  | { status: "preparing" }
  | { status: "receiving"; progress: number | null }
  /** `file` stays in memory so it can go to the share sheet (Save to Photos on iPhone). */
  | { status: "done"; filename: string; file: File }
  | { status: "error"; message: string };

function filenameFrom(header: string | null) {
  const encoded = header?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) return decodeURIComponent(encoded);
  return header?.match(/filename="([^"]+)"/i)?.[1] ?? "weelink";
}

function saveBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Safari starts reading the blob asynchronously, so revoking immediately can cancel the save.
  setTimeout(() => URL.revokeObjectURL(href), 30_000);
}

interface DownloadCallbacks {
  /** Runs even while the screen is hidden behind another tab, unlike an effect. */
  onDone?: (filename: string) => void;
  onError?: () => void;
}

export function useFileDownload({ onDone, onError }: DownloadCallbacks = {}) {
  const [state, setState] = useState<DownloadState>({ status: "idle" });
  const controller = useRef<AbortController | null>(null);
  const callbacks = useRef({ onDone, onError });
  useLayoutEffect(() => {
    callbacks.current = { onDone, onError };
  });

  // No abort on unmount: a tab switch hides this screen, and the download should finish anyway.
  const start = useCallback(async (token: string) => {
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    setState({ status: "preparing" });

    try {
      const res = await fetch(`/api/download?t=${encodeURIComponent(token)}`, { signal: ctrl.signal });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as ApiErrorBody | null;
        setState({ status: "error", message: data?.error.message ?? "File gagal disiapkan. Coba lagi." });
        callbacks.current.onError?.();
        return;
      }

      const total = Number(res.headers.get("x-file-size") ?? res.headers.get("content-length")) || 0;
      const reader = res.body.getReader();
      const chunks: Uint8Array<ArrayBuffer>[] = [];
      let received = 0;
      let shown = -1;
      setState({ status: "receiving", progress: total ? 0 : null });

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.byteLength;
        const pct = total ? Math.min(99, Math.floor((received / total) * 100)) : null;
        if (pct !== null && pct !== shown) {
          shown = pct;
          setState({ status: "receiving", progress: pct });
        }
      }

      const filename = filenameFrom(res.headers.get("content-disposition"));
      const type = res.headers.get("content-type") ?? "application/octet-stream";
      const file = new File(chunks, filename, { type });
      saveBlob(file, filename);
      setState({ status: "done", filename, file });
      callbacks.current.onDone?.(filename);
    } catch (error) {
      if (ctrl.signal.aborted) return;
      console.error(error);
      setState({
        status: "error",
        message: navigator.onLine ? "Unduhan terputus. Periksa koneksi lalu coba lagi." : "Koneksi terputus saat mengunduh. Sambungkan internet lalu coba lagi.",
      });
      callbacks.current.onError?.();
    }
  }, []);

  const cancel = useCallback(() => {
    controller.current?.abort();
    setState({ status: "idle" });
  }, []);

  return { state, start, cancel };
}
