import { createLocalStore } from "./local-store";

export interface Settings {
  /** Short vibrations on press, ready, and error (Android; iPhone browsers ignore it). */
  haptics: boolean;
  /** System notification when a file finishes while WeeLink is in the background. */
  notify: boolean;
}

const DEFAULTS: Settings = { haptics: true, notify: false };

export const settingsStore = createLocalStore<Settings>("weelink-settings", DEFAULTS, (raw) => {
  if (typeof raw !== "object" || raw === null) return null;
  const value = raw as Partial<Settings>;
  return {
    haptics: typeof value.haptics === "boolean" ? value.haptics : DEFAULTS.haptics,
    notify: typeof value.notify === "boolean" ? value.notify : DEFAULTS.notify,
  };
});

export function updateSettings(patch: Partial<Settings>) {
  return settingsStore.set((prev) => ({ ...prev, ...patch }));
}

const PATTERNS = {
  tap: 8,
  success: [14, 70, 22],
  error: [40, 50, 40],
} satisfies Record<string, VibratePattern>;

export type HapticKind = keyof typeof PATTERNS;

export function canVibrate() {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

export function haptic(kind: HapticKind) {
  if (!canVibrate() || !settingsStore.get().haptics) return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    // Some browsers throw before the first user gesture; feedback is optional.
  }
}
