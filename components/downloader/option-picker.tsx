"use client";

import type { ComponentType } from "react";
import { FilmIcon, NoteIcon, PictureIcon } from "@/components/ui/icons";
import { formatBytes } from "@/lib/format";
import type { DownloadOption, MediaMode } from "@/lib/types";

const MODES: Record<MediaMode, { label: string; Icon: ComponentType<{ size?: number }> }> = {
  video: { label: "Video", Icon: FilmIcon },
  audio: { label: "MP3", Icon: NoteIcon },
  image: { label: "Gambar", Icon: PictureIcon },
};

const MODE_ORDER: MediaMode[] = ["video", "audio", "image"];

interface ModeSwitchProps {
  name: string;
  modes: MediaMode[];
  value: MediaMode;
  onChange: (mode: MediaMode) => void;
}

export function ModeSwitch({ name, modes, value, onChange }: ModeSwitchProps) {
  const ordered = MODE_ORDER.filter((m) => modes.includes(m));
  if (ordered.length < 2) return null;

  return (
    <fieldset>
      <legend className="sr-only">Format</legend>
      {/* Same keycap language as the quality keys: the chosen format stays pressed in. */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${ordered.length}, minmax(0, 1fr))` }}>
        {ordered.map((mode) => {
          const { label, Icon } = MODES[mode];
          return (
            <label key={mode} className="block">
              <input type="radio" name={name} value={mode} checked={mode === value} onChange={() => onChange(mode)} className="sr-only" />
              <span className="neu-key min-h-12 flex-row gap-2 text-sm font-semibold">
                <Icon size={18} />
                {label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

interface QualityKeysProps {
  name: string;
  options: DownloadOption[];
  value: string;
  onChange: (id: string) => void;
}

export function QualityKeys({ name, options, value, onChange }: QualityKeysProps) {
  return (
    <fieldset>
      <legend className="sr-only">Kualitas</legend>
      <div className="grid grid-cols-3 gap-3 min-[420px]:grid-cols-[repeat(auto-fill,minmax(6rem,1fr))]">
        {options.map((option) => (
          <label key={option.id} className="block">
            <input
              type="radio"
              name={name}
              value={option.id}
              checked={option.id === value}
              onChange={() => onChange(option.id)}
              className="sr-only"
            />
            <span className="neu-key px-2 py-2.5">
              <span className="flex items-baseline gap-0.5">
                <span className="text-xl leading-none font-extrabold tabular-nums">{option.value}</span>
                {option.unit && <span className="text-xs font-semibold">{option.unit}</span>}
              </span>
              <span className="mt-1 text-xs text-muted tabular-nums">
                {option.sizeBytes ? `± ${formatBytes(option.sizeBytes)}` :" "}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
