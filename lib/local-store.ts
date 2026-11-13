type Listener = () => void;

export interface LocalStore<T> {
  /** Stable snapshot for useSyncExternalStore: the same object until the stored value changes. */
  get: () => T;
  /** Returns false when the browser refused to persist; the value still applies for this visit. */
  set: (next: T | ((prev: T) => T)) => boolean;
  subscribe: (listener: Listener) => () => void;
}

/**
 * A JSON value in localStorage that React can subscribe to, kept in sync across tabs.
 * Private mode and blocked storage fall back to memory instead of throwing.
 */
export function createLocalStore<T>(key: string, fallback: T, parse: (raw: unknown) => T | null): LocalStore<T> {
  let cache: { raw: string | null; value: T } | null = null;
  let memoryOnly = false;
  const listeners = new Set<Listener>();

  function get(): T {
    if (memoryOnly && cache) return cache.value;
    let raw: string | null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      return cache?.value ?? fallback;
    }
    if (cache && cache.raw === raw) return cache.value;
    let value = fallback;
    if (raw) {
      try {
        value = parse(JSON.parse(raw)) ?? fallback;
      } catch {
        value = fallback;
      }
    }
    cache = { raw, value };
    return value;
  }

  function notify() {
    for (const listener of listeners) listener();
  }

  function set(next: T | ((prev: T) => T)): boolean {
    const value = typeof next === "function" ? (next as (prev: T) => T)(get()) : next;
    const raw = JSON.stringify(value);
    let saved = true;
    try {
      localStorage.setItem(key, raw);
      memoryOnly = false;
    } catch {
      saved = false;
      memoryOnly = true;
    }
    cache = { raw, value };
    notify();
    return saved;
  }

  function onStorage(event: StorageEvent) {
    if (event.key === key || event.key === null) notify();
  }

  function subscribe(listener: Listener) {
    if (listeners.size === 0) window.addEventListener("storage", onStorage);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) window.removeEventListener("storage", onStorage);
    };
  }

  return { get, set, subscribe };
}

/** True when localStorage accepts writes. Checked once per visit. */
let storageWorks: boolean | null = null;
export function storageAvailable(): boolean {
  if (storageWorks !== null) return storageWorks;
  try {
    localStorage.setItem("weelink-probe", "1");
    localStorage.removeItem("weelink-probe");
    storageWorks = true;
  } catch {
    storageWorks = false;
  }
  return storageWorks;
}
