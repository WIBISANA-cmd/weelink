export type ToastTone = "neutral" | "success" | "danger" | "offline";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
  action?: ToastAction;
  /** Milliseconds before it leaves on its own; null keeps it until dismissed (offline, update ready). */
  duration: number | null;
}

type Listener = () => void;

const MAX_VISIBLE = 3;
let toasts: Toast[] = [];
const listeners = new Set<Listener>();
let counter = 0;

function emit() {
  for (const listener of listeners) listener();
}

export const toastStore = {
  get: () => toasts,
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** Showing a toast with an id that is already on screen replaces it in place. */
export function showToast(input: { id?: string; message: string; tone?: ToastTone; action?: ToastAction; duration?: number | null }) {
  const id = input.id ?? `t${++counter}`;
  const toast: Toast = {
    id,
    message: input.message,
    tone: input.tone ?? "neutral",
    action: input.action,
    duration: input.duration === undefined ? 4200 : input.duration,
  };
  const exists = toasts.some((t) => t.id === id);
  toasts = exists ? toasts.map((t) => (t.id === id ? toast : t)) : [...toasts, toast].slice(-MAX_VISIBLE);
  emit();
  return id;
}

export function dismissToast(id: string) {
  if (!toasts.some((t) => t.id === id)) return;
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}
