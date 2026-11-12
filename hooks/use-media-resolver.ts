"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { detectPlatform, type Platform } from "@/lib/platforms";
import type { ApiErrorBody, MediaInfo } from "@/lib/types";

export type ResolveState =
  | { phase: "idle" }
  | { phase: "resolving"; url: string; platform: Platform | null }
  | { phase: "error"; url: string; message: string }
  | { phase: "ready"; url: string; media: MediaInfo };

const NETWORK_MESSAGE = "Koneksi ke server terputus. Periksa internet lalu coba lagi.";

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
    return { phase: "error", url, message: NETWORK_MESSAGE };
  }
}

/** `initialUrl` starts resolving on mount, used for links shared into the app. */
export function useMediaResolver(initialUrl?: string) {
  const [state, setState] = useState<ResolveState>(() => (initialUrl ? resolvingState(initialUrl) : { phase: "idle" }));
  const controller = useRef<AbortController | null>(null);

  const run = useCallback((url: string) => {
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    fetchMedia(url, ctrl.signal).then((next) => {
      if (!ctrl.signal.aborted) setState(next);
    });
    return ctrl;
  }, []);

  useEffect(() => {
    if (!initialUrl) return;
    const ctrl = run(initialUrl);
    return () => ctrl.abort();
  }, [initialUrl, run]);

  const resolve = useCallback(
    (url: string) => {
      setState(resolvingState(url));
      run(url);
    },
    [run],
  );

  const reset = useCallback(() => {
    controller.current?.abort();
    setState({ phase: "idle" });
  }, []);

  return { state, resolve, reset };
}
