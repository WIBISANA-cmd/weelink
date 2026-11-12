"use client";

import { useEffect, useRef, useState } from "react";
import { useMediaResolver } from "@/hooks/use-media-resolver";
import { detectPlatform, extractUrl } from "@/lib/platforms";
import { LinkForm } from "./link-form";
import { PlatformStrip } from "./platform-strip";
import { ResultCard } from "./result-card";
import { EmptyPanel, ErrorPanel, ResolvingPanel } from "./status-panels";

export function Downloader({ sharedUrl }: { sharedUrl?: string }) {
  // Frozen on mount: clearing the query below updates search params, which must not cancel the fetch.
  const [initialUrl] = useState(sharedUrl);
  const [value, setValue] = useState(initialUrl ?? "");
  const { state, resolve, reset } = useMediaResolver(initialUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  // Drop ?text= from the address bar so a refresh doesn't fetch the shared link again.
  useEffect(() => {
    if (initialUrl) window.history.replaceState(null, "", window.location.pathname);
  }, [initialUrl]);

  function startOver() {
    reset();
    setValue("");
    inputRef.current?.focus();
  }

  const typedUrl = extractUrl(value);
  const activePlatform = state.phase === "ready" ? state.media.platform : typedUrl ? detectPlatform(typedUrl)?.id : undefined;

  return (
    <div className="mx-auto grid max-w-xl gap-8 pt-2 pb-12 sm:pt-6 lg:max-w-none lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] lg:items-start lg:gap-14 lg:pt-12 xl:gap-20">
      <section aria-labelledby="page-title" className="lg:sticky lg:top-10">
        <h1 id="page-title" className="text-[clamp(1.75rem,7vw,2.75rem)] leading-[1.08] font-extrabold tracking-tight text-balance">
          Tempel link postingan, simpan dengan kualitas pilihanmu.
        </h1>
        <div className="mt-7">
          <LinkForm
            value={value}
            onValueChange={setValue}
            onSubmit={resolve}
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
