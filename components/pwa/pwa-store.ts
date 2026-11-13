"use client";

import { useSyncExternalStore } from "react";
import { BUILD_ID, SERVICE_WORKER_ENABLED, isAndroid, isIOS, isMacSafari, isStandalone } from "@/lib/pwa";
import { SURFACE, readTheme, readThemeMode, subscribeTheme, systemTheme } from "@/lib/theme";
import { dismissToast, showToast } from "@/lib/toast";

/**
 * prompt: Chromium gave us its install dialog. ios / mac-safari: install is a manual step we explain.
 * unsupported: no way to install from this browser (Firefox desktop, or already installed in Chromium).
 */
export type InstallState = "unknown" | "prompt" | "ios" | "mac-safari" | "installed" | "unsupported";
/** ready: a new version is installed and waits for a reload. */
export type UpdateState = "unsupported" | "idle" | "checking" | "current" | "ready";

export interface PwaSnapshot {
  install: InstallState;
  update: UpdateState;
  online: boolean;
  installSheetOpen: boolean;
}

const SERVER: PwaSnapshot = { install: "unknown", update: "idle", online: true, installSheetOpen: false };
const UPDATE_TOAST = "update";
const CONNECTION_TOAST = "connection";
const RECHECK_MS = 30 * 60 * 1000;

let state: PwaSnapshot = SERVER;
const listeners = new Set<() => void>();
let registration: ServiceWorkerRegistration | null = null;
let reloadOnControllerChange = false;
let lastCheck = 0;
let started = false;

function patch(next: Partial<PwaSnapshot>) {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePwa() {
  return useSyncExternalStore(subscribe, () => state, () => SERVER);
}

/* ---------- Install ---------- */

export async function promptInstall() {
  const event = window.__weelinkInstall;
  if (event) {
    await event.prompt();
    const { outcome } = await event.userChoice;
    // A prompt can be shown once; Chromium fires a fresh event later if the user may still install.
    window.__weelinkInstall = undefined;
    if (outcome === "dismissed") patch({ install: "unknown" });
    return;
  }
  if (state.install === "ios" || state.install === "mac-safari") patch({ installSheetOpen: true });
}

export function closeInstallSheet() {
  patch({ installSheetOpen: false });
}

function watchInstall() {
  if (isStandalone()) {
    patch({ install: "installed" });
    return () => {};
  }

  const onInstallable = () => {
    if (window.__weelinkInstall) patch({ install: "prompt" });
  };
  const onInstalled = () => {
    window.__weelinkInstall = undefined;
    patch({ install: "installed" });
    showToast({ message: "WeeLink terpasang. Buka dari layar utama atau menu aplikasi.", tone: "success" });
  };

  window.addEventListener("weelink-installable", onInstallable);
  window.addEventListener("appinstalled", onInstalled);

  let fallback: ReturnType<typeof setTimeout> | undefined;
  if (window.__weelinkInstall) patch({ install: "prompt" });
  else if (isIOS()) patch({ install: "ios" });
  else if (isMacSafari()) patch({ install: "mac-safari" });
  // Chromium fires its event shortly after load, or never when the app is already installed.
  else fallback = setTimeout(() => state.install === "unknown" && patch({ install: "unsupported" }), 5000);

  return () => {
    clearTimeout(fallback);
    window.removeEventListener("weelink-installable", onInstallable);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

/* ---------- Service worker and updates ---------- */

function askVersion(worker: ServiceWorker): Promise<string | null> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(null), 1500);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      resolve(typeof event.data === "string" ? event.data : null);
    };
    worker.postMessage({ type: "GET_VERSION" }, [channel.port2]);
  });
}

async function onWorkerWaiting(worker: ServiceWorker) {
  // This page may already be the new build (it loaded fresh from the network); then swap quietly.
  if ((await askVersion(worker)) === BUILD_ID) {
    worker.postMessage({ type: "SKIP_WAITING" });
    patch({ update: "current" });
    return;
  }
  patch({ update: "ready" });
  showToast({
    id: UPDATE_TOAST,
    message: "Versi baru WeeLink siap dipakai.",
    action: { label: "Muat ulang", onClick: applyUpdate },
    duration: null,
  });
}

function trackInstalling(worker: ServiceWorker) {
  worker.addEventListener("statechange", () => {
    // No controller means this is the first install, not an update.
    if (worker.state === "installed" && navigator.serviceWorker.controller) onWorkerWaiting(worker);
    if (worker.state === "redundant" && state.update === "checking") patch({ update: "current" });
  });
}

export function applyUpdate() {
  dismissToast(UPDATE_TOAST);
  const waiting = registration?.waiting;
  if (!waiting) {
    window.location.reload();
    return;
  }
  reloadOnControllerChange = true;
  waiting.postMessage({ type: "SKIP_WAITING" });
}

export async function checkForUpdate() {
  if (!registration) return;
  patch({ update: "checking" });
  lastCheck = Date.now();
  try {
    await registration.update();
  } catch {
    patch({ update: navigator.onLine ? "current" : "idle" });
    if (!navigator.onLine) showToast({ message: "Tidak bisa memeriksa pembaruan saat offline.", tone: "offline" });
    return;
  }
  if (registration.waiting) onWorkerWaiting(registration.waiting);
  else if (!registration.installing) patch({ update: "current" });
}

function startServiceWorker() {
  if (!SERVICE_WORKER_ENABLED || !("serviceWorker" in navigator)) {
    patch({ update: "unsupported" });
    return () => {};
  }

  const onControllerChange = () => {
    if (reloadOnControllerChange) window.location.reload();
  };
  const onVisible = () => {
    if (document.visibilityState === "visible" && registration && Date.now() - lastCheck > RECHECK_MS) {
      lastCheck = Date.now();
      registration.update().catch(() => undefined);
    }
  };

  navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
  document.addEventListener("visibilitychange", onVisible);

  navigator.serviceWorker
    .register("/sw.js", { scope: "/", updateViaCache: "none" })
    .then((reg) => {
      registration = reg;
      lastCheck = Date.now();
      if (reg.waiting && navigator.serviceWorker.controller) onWorkerWaiting(reg.waiting);
      if (reg.installing) trackInstalling(reg.installing);
      reg.addEventListener("updatefound", () => reg.installing && trackInstalling(reg.installing));
    })
    .catch((error) => {
      console.error("Service worker gagal didaftarkan", error);
      patch({ update: "unsupported" });
    });

  return () => {
    navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

/* ---------- Connection ---------- */

function watchConnection() {
  let wentOffline = false;
  const update = () => {
    const online = navigator.onLine;
    patch({ online });
    if (!online) {
      wentOffline = true;
      showToast({
        id: CONNECTION_TOAST,
        message: "Kamu sedang offline. Riwayat dan pengaturan tetap bisa dibuka.",
        tone: "offline",
        duration: null,
      });
    } else if (wentOffline) {
      wentOffline = false;
      showToast({ id: CONNECTION_TOAST, message: "Kembali online.", tone: "success", duration: 2500 });
    }
  };
  update();
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  return () => {
    window.removeEventListener("online", update);
    window.removeEventListener("offline", update);
  };
}

/* ---------- Theme ---------- */

/** Status bar and desktop title bar follow the chosen theme, not only the system one. */
function syncThemeColor() {
  const color = SURFACE[readTheme()];
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) meta.content = color;
}

function watchTheme() {
  const media = matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    if (readThemeMode() === "system") document.documentElement.dataset.theme = systemTheme();
  };
  media.addEventListener("change", onSystemChange);
  const unsubscribe = subscribeTheme(syncThemeColor);
  syncThemeColor();
  return () => {
    media.removeEventListener("change", onSystemChange);
    unsubscribe();
  };
}

/** Starts every browser-side PWA concern once; safe to call again from a re-run effect. */
export function startPwa() {
  if (started) return () => {};
  started = true;
  const stops = [watchInstall(), startServiceWorker(), watchConnection(), watchTheme()];
  return () => {
    started = false;
    for (const stop of stops) stop();
  };
}

/* ---------- Install nudge ---------- */

const NUDGE_KEY = "weelink-install-nudged";

/**
 * Asked once, right after the first file is saved: the moment the app has proven useful.
 * Never on first load, and never again after it was shown.
 */
export function nudgeInstallOnce() {
  const { install } = state;
  if (install !== "prompt" && install !== "ios" && install !== "mac-safari") return;
  try {
    if (localStorage.getItem(NUDGE_KEY)) return;
    localStorage.setItem(NUDGE_KEY, "1");
  } catch {
    return;
  }
  const message =
    install === "prompt" && isAndroid()
      ? "Pasang WeeLink supaya muncul di menu Bagikan TikTok, Instagram, dan aplikasi lain."
      : install === "prompt" || install === "mac-safari"
        ? "Pasang WeeLink sebagai aplikasi: jendelanya sendiri, dibuka seperti aplikasi lain di komputermu."
        : "Tambahkan WeeLink ke Layar Utama supaya terbuka penuh tanpa bar Safari.";
  showToast({ id: "install-nudge", message, action: { label: "Pasang", onClick: () => promptInstall() }, duration: 9000 });
}
