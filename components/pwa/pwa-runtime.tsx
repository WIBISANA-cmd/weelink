"use client";

import { useEffect } from "react";
import { InstallSheet } from "./install-sheet";
import { startPwa } from "./pwa-store";

/** Long enough for the W to draw and the key to press once; the splash never holds a ready app longer. */
const SPLASH_MIN_MS = 1000;
const SPLASH_MIN_REDUCED_MS = 250;
const FONT_WAIT_MS = 1200;

function dismissSplash() {
  const root = document.documentElement;
  if (!root.hasAttribute("data-splash")) return () => {};

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const timers: ReturnType<typeof setTimeout>[] = [];
  let cancelled = false;

  // Waiting for the font keeps the first frame after the splash from re-flowing its headline.
  const fontsReady = Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, FONT_WAIT_MS))]);
  fontsReady.then(() => {
    if (cancelled) return;
    const wait = Math.max(0, (reduced ? SPLASH_MIN_REDUCED_MS : SPLASH_MIN_MS) - performance.now());
    timers.push(
      setTimeout(() => {
        root.dataset.splash = "done"; // track completes
        timers.push(
          setTimeout(
            () => {
              root.dataset.splash = "out"; // splash lifts, the shell settles in
              timers.push(setTimeout(() => root.removeAttribute("data-splash"), 700));
            },
            reduced ? 0 : 240,
          ),
        );
      }, wait),
    );
  });

  return () => {
    cancelled = true;
    timers.forEach(clearTimeout);
  };
}

export function PwaRuntime() {
  useEffect(() => {
    const stopSplash = dismissSplash();
    const stopPwa = startPwa();
    return () => {
      stopSplash();
      stopPwa();
    };
  }, []);

  return <InstallSheet />;
}
