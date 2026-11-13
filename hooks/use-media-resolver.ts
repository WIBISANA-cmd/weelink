"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { detectPlatform, type Platform } from "@/lib/platforms";
import type { ApiErrorBody, MediaInfo } from "@/lib/types";

export type ResolveState =
  | { phase: "idle" }
  | { phase: "resolving"; url: string; platform: Platform | null }
  | { phase: "error"; url: string; message: string }
  | { phase: "ready"; url: string; media: MediaInfo };

const NETWORK_MESSAGE = "Koneksi ke server terputus. Periksa internet lalu coba lagi.";
const OFFLINE_MESSAGE = "Kamu sedang offline. Sambungkan internet, lalu tekan Coba lagi.";

const resolvingState = (url: string): ResolveState => ({ phase: "resolving", url, platform: detectPlatform(url) });

async function fetchMedia(url: string, signal: AbortSignal): Promise<ResolveState> {
  try {
    const res = await fetch("/api/resolve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
      signal,
    });
    const data = (await res.json()) as MediaInfo | ApiErrorBody;
    return "error" in data ? { phase: "error", url, message: data.error.message } : { phase: "ready", url, media: data };
  } catch (error) {
    if (!signal.aborted) console.error(error);
    return { phase: "error", url, message: navigator.onLine ? NETWORK_MESSAGE : OFFLINE_MESSAGE };
  }
}

interface ResolverCallbacks {
  /** Run when the answer arrives, even if a tab switch has hidden the screen (effects would wait). */
  onReady?: (media: MediaInfo) => void;
  onError?: () => void;
}

/**
 * `initialUrl` only sets the first state to "resolving" so a shared link never flashes the empty form;
 * the caller starts the request with `resolve`. Nothing is aborted when the screen is hidden by a tab
 * switch, so a link keeps loading while the user looks at another tab.
 */
export function useMediaResolver(initialUrl?: string, { onReady, onError }: ResolverCallbacks = {}) {
  const [state, setState] = useState<ResolveState>(() => (initialUrl ? resolvingState(initialUrl) : { phase: "idle" }));
  const controller = useRef<AbortController | null>(null);
  const callbacks = useRef({ onReady, onError });
  useLayoutEffect(() => {
    callbacks.current = { onReady, onError };
  });

  const resolve = useCallback((url: string) => {
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    setState(resolvingState(url));
    fetchMedia(url, ctrl.signal).then((next) => {
      if (ctrl.signal.aborted) return;
      setState(next);
      if (next.phase === "ready") callbacks.current.onReady?.(next.media);
      if (next.phase === "error") callbacks.current.onError?.();
    });
  }, []);

  const reset = useCallback(() => {
    controller.current?.abort();
    setState({ phase: "idle" });
  }, []);

  return { state, resolve, reset };
}
