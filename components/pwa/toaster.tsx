"use client";

import { useEffect, useRef, useSyncExternalStore, type PointerEvent } from "react";
import { AlertIcon, CheckIcon, CloseIcon, CloudOffIcon } from "@/components/ui/icons";
import { dismissToast, toastStore, type Toast } from "@/lib/toast";

const SWIPE_DISMISS_PX = 80;
const EMPTY: Toast[] = [];

const TONE_ICON = {
  success: <CheckIcon size={18} className="text-accent" />,
  danger: <AlertIcon size={18} className="text-danger" />,
  offline: <CloudOffIcon size={18} className="text-muted" />,
  neutral: null,
};

function ToastItem({ toast }: { toast: Toast }) {
  const ref = useRef<HTMLLIElement>(null);
  const remaining = useRef(toast.duration);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const swipe = useRef<{ x: number; dx: number } | null>(null);

  function leave(direction: "down" | "left" | "right" = "down") {
    const el = ref.current;
    if (!el || el.dataset.leaving) return;
    el.dataset.leaving = direction;
    const done = () => dismissToast(toast.id);
    el.addEventListener("animationend", done, { once: true });
    setTimeout(done, 400);
  }

  function pause() {
    clearTimeout(timer.current);
    if (remaining.current !== null && startedAt.current) {
      remaining.current = Math.max(800, remaining.current - (Date.now() - startedAt.current));
    }
    startedAt.current = 0;
  }

  function resume() {
    if (remaining.current === null) return;
    clearTimeout(timer.current);
    startedAt.current = Date.now();
    timer.current = setTimeout(() => leave(), remaining.current);
  }

  // A replaced toast (same id, new message) restarts its clock.
  useEffect(() => {
    remaining.current = toast.duration;
    resume();
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  function onPointerDown(event: PointerEvent<HTMLLIElement>) {
    if ((event.target as Element).closest("button")) return;
    swipe.current = { x: event.clientX, dx: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
    pause();
  }

  function onPointerMove(event: PointerEvent<HTMLLIElement>) {
    if (!swipe.current || !ref.current) return;
    const dx = event.clientX - swipe.current.x;
    swipe.current.dx = dx;
    ref.current.style.transition = "none";
    ref.current.style.translate = `${dx}px 0`;
    ref.current.style.opacity = String(1 - Math.min(0.6, Math.abs(dx) / 240));
  }

  function onPointerUp() {
    const el = ref.current;
    const state = swipe.current;
    swipe.current = null;
    if (!el || !state) return;
    el.style.transition = "";
    if (Math.abs(state.dx) > SWIPE_DISMISS_PX) {
      leave(state.dx > 0 ? "right" : "left");
    } else {
      el.style.translate = "";
      el.style.opacity = "";
      resume();
    }
  }

  return (
    <li
      ref={ref}
      className="toast neu-panel"
      onPointerEnter={pause}
      onPointerLeave={() => !swipe.current && resume()}
      onFocus={pause}
      onBlur={resume}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {TONE_ICON[toast.tone] && (
        <span className="grid size-8 shrink-0 place-items-center" aria-hidden="true">
          {TONE_ICON[toast.tone]}
        </span>
      )}
      <p className="min-w-0 flex-1 py-1 text-sm leading-snug font-medium">{toast.message}</p>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            leave();
          }}
          className="neu-btn shrink-0 px-3.5 text-sm text-accent"
        >
          {toast.action.label}
        </button>
      )}
      <button type="button" onClick={() => leave()} className="neu-btn size-11 shrink-0 rounded-full text-muted" aria-label="Tutup notifikasi">
        <CloseIcon size={14} />
      </button>
    </li>
  );
}

/** Snackbars above the tab bar. Announced politely; nothing here needs to interrupt. */
export function Toaster() {
  const toasts = useSyncExternalStore(toastStore.subscribe, toastStore.get, () => EMPTY);
  return (
    <section aria-label="Notifikasi" className="toaster">
      <ol aria-live="polite" className="flex flex-col gap-2.5">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </ol>
    </section>
  );
}
