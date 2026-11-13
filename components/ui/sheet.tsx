"use client";

import { useEffect, useId, useLayoutEffect, useRef, type PointerEvent, type ReactNode } from "react";
import { CloseIcon } from "./icons";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}

const DRAG_CLOSE_PX = 96;
const DRAG_CLOSE_SPEED = 0.6; // px per ms

/**
 * Bottom sheet on phones, centered dialog from 1024px. Built on <dialog>, so focus is trapped,
 * the page behind is inert, and Escape closes it without extra code.
 */
export function Sheet({ open, onClose, title, description, children }: SheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; startT: number; dy: number } | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const panel = panelRef.current;
    if (!dialog || !panel) return;

    if (open && !dialog.open) {
      panel.style.translate = "";
      delete dialog.dataset.closing;
      dialog.showModal();
      return;
    }
    if (!open && dialog.open) {
      // Play the exit before the dialog leaves the top layer.
      dialog.dataset.closing = "";
      const finish = () => {
        dialog.close();
        delete dialog.dataset.closing;
        panel.style.translate = "";
      };
      const fallback = setTimeout(finish, 400);
      panel.addEventListener(
        "animationend",
        () => {
          clearTimeout(fallback);
          finish();
        },
        { once: true },
      );
    }
  }, [open]);

  // When the route hides (Activity), a modal left open would keep the whole page inert.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    // Capturing the pointer would retarget the click away from the close button.
    if (event.button !== 0 || (event.target as Element).closest("button")) return;
    drag.current = { startY: event.clientY, startT: performance.now(), dy: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current || !panelRef.current) return;
    const dy = Math.max(0, event.clientY - drag.current.startY);
    drag.current.dy = dy;
    panelRef.current.style.transition = "none";
    panelRef.current.style.translate = `0 ${dy}px`;
  }

  function onPointerUp() {
    const state = drag.current;
    const panel = panelRef.current;
    drag.current = null;
    if (!state || !panel) return;
    panel.style.transition = "";
    const speed = state.dy / Math.max(1, performance.now() - state.startT);
    if (state.dy > DRAG_CLOSE_PX || (state.dy > 24 && speed > DRAG_CLOSE_SPEED)) onClose();
    else panel.style.translate = "";
  }

  return (
    <dialog
      ref={dialogRef}
      className="sheet"
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // The dialog box itself fills the screen; a click that lands on it, not the panel, is the backdrop.
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div ref={panelRef} className="sheet-panel neu-panel">
        <div
          className="sheet-grip"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="sheet-handle" aria-hidden="true" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 pt-1">
              <h2 id={titleId} className="text-lg leading-snug font-bold">
                {title}
              </h2>
              {description && (
                <p id={descId} className="mt-1 text-sm text-muted">
                  {description}
                </p>
              )}
            </div>
            <button type="button" onClick={onClose} className="neu-btn size-11 shrink-0 rounded-full" aria-label="Tutup">
              <CloseIcon size={18} />
            </button>
          </div>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </dialog>
  );
}
