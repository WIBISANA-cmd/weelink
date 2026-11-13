/** Stamped by next.config.ts at build time; the service worker reports the same value. */
export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";

/** Dev servers rebuild chunks constantly, so the worker only runs in production unless asked for. */
export const SERVICE_WORKER_ENABLED =
  process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_PWA_DEV === "1";

const BOOT_KEY = "weelink-booted";

/**
 * Runs in <head> before paint:
 * - marks installed launches so CSS can drop browser-only affordances,
 * - shows the splash once per session (a cold launch of the installed app is a new session),
 * - holds on to the install prompt, which Chromium can fire before React hydrates.
 */
export const bootScript = `(function(){var d=document.documentElement;try{var m=function(q){return matchMedia("(display-mode: "+q+")").matches};if(m("standalone")||m("window-controls-overlay")||m("fullscreen")||navigator.standalone===true)d.setAttribute("data-standalone","");if(!sessionStorage.getItem("${BOOT_KEY}")){sessionStorage.setItem("${BOOT_KEY}","1");d.setAttribute("data-splash","")}}catch(e){}addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__weelinkInstall=e;dispatchEvent(new Event("weelink-installable"))})})()`;

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __weelinkInstall?: BeforeInstallPromptEvent;
  }
  interface Navigator {
    /** iOS Safari: true when launched from the home screen. */
    standalone?: boolean;
  }
}

export function isStandalone() {
  return document.documentElement.hasAttribute("data-standalone");
}

export function isIOS() {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch support gives it away.
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function isMacSafari() {
  const ua = navigator.userAgent;
  return /Macintosh/.test(ua) && navigator.maxTouchPoints <= 1 && /Safari\//.test(ua) && !/Chrome|Chromium|Edg|Firefox|OPR/.test(ua);
}

export function isAndroid() {
  return /Android/.test(navigator.userAgent);
}
