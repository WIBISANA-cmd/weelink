"use client";

import Link from "next/link";
import { useRef, type MouseEvent, type PointerEvent } from "react";
import { CheckIcon, MoreIcon, TrashIcon } from "@/components/ui/icons";
import { PlatformMark } from "@/components/ui/platform-mark";
import { reopenHref, type HistoryItem } from "@/lib/history";
import { PLATFORMS } from "@/lib/platforms";
import { haptic } from "@/lib/settings";

const timeFormat = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" });
const SWIPE_DELETE_RATIO = 0.35;

interface HistoryRowProps {
  item: HistoryItem;
  removing: boolean;
  onActions: (item: HistoryItem) => void;
  onDelete: (item: HistoryItem) => void;
}

/**
 * Tap reads the link again. On touch screens, swiping left past a third of the row deletes it;
 * the Opsi button offers the same delete for keyboard and mouse.
 */
export function HistoryRow({ item, removing, onActions, onDelete }: HistoryRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; dx: number; axis: "x" | "y" | null } | null>(null);
  const swallowClick = useRef(false);
  const platform = PLATFORMS.find((p) => p.id === item.platform)?.name ?? "Situs lain";
  const meta = [item.author, platform, timeFormat.format(item.at)].filter(Boolean).join(" · ");

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" || (event.target as Element).closest("button")) return;
    drag.current = { x: event.clientX, y: event.clientY, dx: 0, axis: null };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    const row = rowRef.current;
    if (!state || !row) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    if (!state.axis) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        state.axis = "x";
        event.currentTarget.setPointerCapture(event.pointerId);
      } else if (Math.abs(dy) > 8) {
        state.axis = "y"; // the page is scrolling; leave it alone
      }
    }
    if (state.axis !== "x") return;
    state.dx = Math.min(0, dx);
    row.style.transition = "none";
    row.style.translate = `${state.dx}px 0`;
    row.parentElement?.style.setProperty("--reveal", String(Math.min(1, -state.dx / (row.offsetWidth * SWIPE_DELETE_RATIO))));
  }

  function onPointerUp() {
    const state = drag.current;
    const row = rowRef.current;
    drag.current = null;
    if (!state || state.axis !== "x" || !row) return;
    swallowClick.current = true;
    row.style.transition = "";
    if (-state.dx > row.offsetWidth * SWIPE_DELETE_RATIO) {
      row.style.translate = "-100% 0";
      haptic("tap");
      onDelete(item);
    } else {
      row.style.translate = "";
      row.parentElement?.style.setProperty("--reveal", "0");
    }
  }

  function onClickCapture(event: MouseEvent) {
    // A swipe ends with a click on the link underneath; that click is not a tap.
    if (!swallowClick.current) return;
    swallowClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <li className="history-item" data-removing={removing || undefined}>
      <div className="min-h-0 overflow-hidden">
        <div className="history-swipe">
          <div className="history-swipe-bg" aria-hidden="true">
            <TrashIcon size={18} />
            Hapus
          </div>
          <div
            ref={rowRef}
            className="history-row"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onClickCapture={onClickCapture}
          >
            <Link href={reopenHref(item.url)} transitionTypes={["nav-back"]} onClick={() => haptic("tap")} className="history-link">
              <span className="neu-well grid size-11 shrink-0 place-items-center rounded-xl text-muted">
                <PlatformMark id={item.platform} size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{item.title}</span>
                <span className="mt-0.5 block truncate text-xs text-muted">{meta}</span>
                {item.savedLabel && (
                  <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-accent">
                    <CheckIcon size={12} />
                    Tersimpan {item.savedLabel}
                  </span>
                )}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => onActions(item)}
              className="neu-btn size-11 shrink-0 rounded-full text-muted"
              aria-label={`Opsi untuk ${item.title}`}
            >
              <MoreIcon size={18} />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
