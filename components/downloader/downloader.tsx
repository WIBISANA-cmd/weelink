"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMediaResolver } from "@/hooks/use-media-resolver";
import { recordResolved } from "@/lib/history";
import { detectPlatform, extractUrl } from "@/lib/platforms";
import { haptic } from "@/lib/settings";
import { LinkForm } from "./link-form";
import { PlatformStrip } from "./platform-strip";
import { ResultCard } from "./result-card";
import { EmptyPanel, ErrorPanel, ResolvingPanel } from "./status-panels";

const onReady = (media: Parameters<typeof recordResolved>[0]) => {
  recordResolved(media);
  haptic("success");
};
const onError = () => haptic("error");

export function Downloader({ sharedUrl }: { sharedUrl?: string }) {
  // Frozen on mount: it only picks the first state, so a shared link never flashes the empty form.
  const [initialUrl] = useState(sharedUrl);
  const [value, setValue] = useState(initialUrl ?? "");
  const { state, resolve, reset } = useMediaResolver(initialUrl, { onReady, onError });
  const inputRef = useRef<HTMLInputElement>(null);
  const consumed = useRef<string | undefined>(undefined);

  const read = useCallback(
    (url: string) => {
      haptic("tap");
      setValue(url);
      resolve(url);
    },
    [resolve],
  );

  // A link from the share sheet or Riwayat: read it once, then drop it from the address bar so a
  // refresh doesn't read it again. The ref also stops a re-read when this screen is shown again.
  useEffect(() => {
    if (!sharedUrl || consumed.current === sharedUrl) return;
    consumed.current = sharedUrl;
    read(sharedUrl);
    window.history.replaceState(null, "", window.location.pathname);
  }, [sharedUrl, read]);

  // Desktop habit: Ctrl/Cmd+V anywhere on this screen reads the copied link, no need to click the field first.
  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']") || document.querySelector("dialog[open]")) return;
      const url = extractUrl(event.clipboardData?.getData("text") ?? "");
      if (!url) return;
      event.preventDefault();
      read(url);
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [read]);

  function startOver() {
    reset();
    setValue("");
    inputRef.current?.focus();
  }

  const typedUrl = extractUrl(value);
  const activePlatform = state.phase === "ready" ? state.media.platform : typedUrl ? detectPlatform(typedUrl)?.id : undefined;

  return (
    <div className="mx-auto grid max-w-xl grid-cols-[minmax(0,1fr)] gap-8 pt-2 pb-12 sm:pt-6 lg:max-w-none lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] lg:items-start lg:gap-14 lg:pt-12 xl:gap-20">
      <section aria-labelledby="page-title" className="lg:sticky lg:top-10">
        <h1 id="page-title" className="text-[clamp(1.75rem,7vw,2.75rem)] leading-[1.08] font-extrabold tracking-tight text-balance">
          Tempel link postingan, simpan dengan kualitas pilihanmu.
        </h1>
        <div className="mt-7">
          <LinkForm
            value={value}
            onValueChange={setValue}
            onSubmit={read}
            busy={state.phase === "resolving"}
            prominent={state.phase !== "ready"}
            inputRef={inputRef}
          />
        </div>
        {/* On phones the strip would push the result below the fold, so it steps aside once there is one. */}
        <div className={`mt-8 ${state.phase === "idle" ? "" : "hidden lg:block"}`}>
          <PlatformStrip active={activePlatform} />
        </div>
      </section>

      <section aria-label="Hasil" className="min-w-0">
        {state.phase === "idle" && (
          <div className="hidden lg:block">
            <EmptyPanel />
          </div>
        )}
        {state.phase === "resolving" && <ResolvingPanel platform={state.platform} onCancel={reset} />}
        {state.phase === "error" && (
          <ErrorPanel message={state.message} onRetry={() => resolve(state.url)} onChangeLink={startOver} />
        )}
        {state.phase === "ready" && <ResultCard key={state.url} media={state.media} onAnother={startOver} />}
      </section>
    </div>
  );
}
