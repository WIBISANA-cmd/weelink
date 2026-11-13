"use client";

import { useEffect, useRef, useState } from "react";
import { FilmIcon } from "@/components/ui/icons";
import { PlatformMark } from "@/components/ui/platform-mark";
import { nudgeInstallOnce } from "@/components/pwa/pwa-store";
import { useFileDownload } from "@/hooks/use-file-download";
import { formatDuration, optionLabel } from "@/lib/format";
import { recordSaved } from "@/lib/history";
import { notifyFileReady } from "@/lib/notify";
import { haptic } from "@/lib/settings";
import { PLATFORMS } from "@/lib/platforms";
import type { MediaEntry, MediaInfo, MediaMode } from "@/lib/types";
import { ModeSwitch, QualityKeys } from "./option-picker";
import { SaveButton } from "./save-button";

const PREVIEW_MAX_REM = 22;

function Preview({ entry }: { entry: MediaEntry }) {
  const [failed, setFailed] = useState(false);
  const ratio = entry.width && entry.height ? entry.width / entry.height : 16 / 9;

  return (
    <div className="neu-well p-2">
      <div
        className="relative mx-auto grid place-items-center overflow-hidden rounded-[0.875rem] bg-surface"
        style={{ aspectRatio: String(ratio), width: `min(100%, ${PREVIEW_MAX_REM * ratio}rem)` }}
      >
        {entry.previewUrl && !failed ? (
          // Previews come from our own proxy route with signed tokens, which next/image can't optimize.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.previewUrl}
            alt=""
            width={entry.width ?? 640}
            height={entry.height ?? 360}
            onError={() => setFailed(true)}
            className="size-full object-cover"
          />
        ) : (
          <FilmIcon size={36} className="text-muted" />
        )}
        {entry.durationSec ? (
          <span className="absolute right-2 bottom-2 rounded-lg bg-black/70 px-2 py-0.5 text-xs font-semibold text-white tabular-nums">
            {formatDuration(entry.durationSec)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function EntryPicker({ entries, value, onChange }: { entries: MediaEntry[]; value: number; onChange: (i: number) => void }) {
  return (
    <fieldset>
      <legend className="text-sm text-muted">
        Item {value + 1} dari {entries.length}
      </legend>
      <div className="-mx-1 mt-2 flex gap-3 overflow-x-auto px-1 pt-1 pb-3">
        {entries.map((entry, i) => (
          <label key={entry.id} className="block shrink-0">
            <input type="radio" name="entry" checked={i === value} onChange={() => onChange(i)} className="sr-only" />
            <span className="neu-key size-16 overflow-hidden p-1.5">
              {entry.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.previewUrl} alt="" width={52} height={52} loading="lazy" className="size-full rounded-[0.6rem] object-cover" />
              ) : (
                <span className="font-bold tabular-nums">{i + 1}</span>
              )}
              <span className="sr-only">Item {i + 1}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface ResultCardProps {
  media: MediaInfo;
  onAnother: () => void;
}

export function ResultCard({ media, onAnother }: ResultCardProps) {
  const [entryIndex, setEntryIndex] = useState(0);
  const entry = media.entries[entryIndex];
  const modes = [...new Set(entry.options.map((o) => o.mode))];

  const [mode, setMode] = useState<MediaMode>(modes[0]);
  const activeMode = modes.includes(mode) ? mode : modes[0];
  const options = entry.options.filter((o) => o.mode === activeMode);

  const [optionId, setOptionId] = useState<string | undefined>(options[0]?.id);
  const option = options.find((o) => o.id === optionId) ?? options[0];

  const savingLabel = useRef("");
  const download = useFileDownload({
    onDone: (filename) => {
      recordSaved(media.sourceUrl, savingLabel.current);
      haptic("success");
      notifyFileReady(filename);
      nudgeInstallOnce();
    },
    onError: () => haptic("error"),
  });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const announced = useRef(false);
  const platformName = PLATFORMS.find((p) => p.id === media.platform)?.name;

  // Move focus to the result so keyboard and screen reader users land where the content appeared.
  // Once only: coming back to this tab re-runs effects, and that must not yank focus or scroll.
  useEffect(() => {
    const heading = headingRef.current;
    if (!heading || announced.current) return;
    announced.current = true;
    heading.focus({ preventScroll: true });
    const singleColumn = !matchMedia("(min-width: 1024px)").matches;
    if (singleColumn && heading.getBoundingClientRect().top > window.innerHeight * 0.6) {
      const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
      heading.closest("article")?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    }
  }, []);

  function pickEntry(i: number) {
    download.cancel();
    setEntryIndex(i);
    setOptionId(undefined);
  }

  function pickMode(next: MediaMode) {
    download.cancel();
    setMode(next);
    setOptionId(undefined);
  }

  function pickOption(id: string) {
    download.cancel();
    setOptionId(id);
  }

  return (
    <article className="neu-panel animate-rise scroll-mt-4 p-4 sm:p-6" aria-labelledby="result-title">
      <Preview key={entry.id} entry={entry} />

      <div className="mt-5 px-1">
        <h2 id="result-title" ref={headingRef} tabIndex={-1} className="line-clamp-2 text-lg leading-snug font-bold focus-visible:outline-none">
          {entry.title}
        </h2>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
          <PlatformMark id={media.platform} size={14} />
          <span className="truncate">{[media.author, platformName].filter(Boolean).join(" · ")}</span>
        </p>
      </div>

      <div className="mt-6 grid gap-5">
        {media.entries.length > 1 && <EntryPicker entries={media.entries} value={entryIndex} onChange={pickEntry} />}
        <ModeSwitch name="mode" modes={modes} value={activeMode} onChange={pickMode} />
        {option && (
          <>
            <QualityKeys name="quality" options={options} value={option.id} onChange={pickOption} />
            <SaveButton label={optionLabel(option)} state={download.state} onSave={() => {
                savingLabel.current = optionLabel(option);
                haptic("tap");
                download.start(option.token);
              }} onCancel={download.cancel} />
          </>
        )}
      </div>

      <button type="button" onClick={onAnother} className="neu-btn mt-2 w-full px-4 text-sm">
        Link lain
      </button>
    </article>
  );
}
