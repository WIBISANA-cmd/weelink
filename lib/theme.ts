export type Theme = "light" | "dark";
export type ThemeMode = Theme | "system";

export const THEME_STORAGE_KEY = "weelink-theme";

/** The page surface per theme; the status bar and title bar take this color so the app reads as one material. */
export const SURFACE: Record<Theme, string> = { light: "#e3e8f0", dark: "#1e2430" };

/** Runs in <head> before paint so the saved or system theme never flashes. */
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t)}catch(e){document.documentElement.setAttribute("data-theme","light")}})()`;

const MODE_EVENT = "weelink-theme-mode";

export function systemTheme(): Theme {
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function readThemeMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

export function setThemeMode(mode: ThemeMode) {
  try {
    if (mode === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Private mode can block storage; the switch still applies for this visit.
  }
  document.documentElement.dataset.theme = mode === "system" ? systemTheme() : mode;
  window.dispatchEvent(new Event(MODE_EVENT));
}

/** Fires on any theme change: the attribute flipping, or system mode chosen while the attribute stays the same. */
export function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  window.addEventListener(MODE_EVENT, onChange);
  return () => {
    observer.disconnect();
    window.removeEventListener(MODE_EVENT, onChange);
  };
}

export const readTheme = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
