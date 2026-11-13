"use client";

import { useSyncExternalStore } from "react";
import { haptic } from "@/lib/settings";
import { readTheme, setThemeMode, subscribeTheme, type Theme } from "@/lib/theme";
import { MoonIcon, SunIcon } from "./icons";

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => null);
  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => {
        haptic("tap");
        setThemeMode(next);
      }}
      className="neu-btn size-11 rounded-full"
      aria-label={next === "dark" ? "Ganti ke mode gelap" : "Ganti ke mode terang"}
    >
      <span className="grid size-5 place-items-center [&>svg]:transition-transform [&>svg]:duration-500">
        {theme === "dark" ? <SunIcon className="rotate-0" /> : <MoonIcon className="-rotate-12" />}
      </span>
    </button>
  );
}
