"use client";

import { useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme";
import { MoonIcon, SunIcon } from "./icons";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

const readTheme = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => null);
  const next: Theme = theme === "dark" ? "light" : "dark";

  function toggle() {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private mode can block storage; the switch still applies for this visit.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="neu-btn size-11 rounded-full"
      aria-label={next === "dark" ? "Ganti ke mode gelap" : "Ganti ke mode terang"}
    >
      <span className="grid size-5 place-items-center [&>svg]:transition-transform [&>svg]:duration-500">
        {theme === "dark" ? <SunIcon className="rotate-0" /> : <MoonIcon className="-rotate-12" />}
      </span>
    </button>
  );
}
