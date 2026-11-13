"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { AlertIcon, CopyIcon, ExternalIcon, HistoryIcon, RetryIcon, TrashIcon } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { historyStore, removeHistory, reopenHref, restoreHistory, type HistoryItem } from "@/lib/history";
import { storageAvailable } from "@/lib/local-store";
import { haptic } from "@/lib/settings";
import { showToast } from "@/lib/toast";
import { ClearHistorySheet } from "./clear-history-sheet";
import { HistoryRow } from "./history-row";

const dayFormat = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long" });
const fullFormat = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });
const COLLAPSE_MS = 220;

function dayLabel(at: number) {
  const day = new Date(at);
  day.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (diff === 0) return "Hari ini";
  if (diff === 1) return "Kemarin";
  return dayFormat.format(day);
}

function groupByDay(items: HistoryItem[]) {
  const groups: { label: string; items: HistoryItem[] }[] = [];
  for (const item of items) {
    const label = dayLabel(item.at);
    const last = groups.at(-1);
    if (last?.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function HistoryScreen() {
  const items = useSyncExternalStore(historyStore.subscribe, historyStore.get, () => null);
  const [selected, setSelected] = useState<HistoryItem | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [removing, setRemoving] = useState<Set<string>>(() => new Set());

  function remove(item: HistoryItem) {
    setRemoving((prev) => new Set(prev).add(item.url));
    // Let the row fold away before the list closes the gap.
    setTimeout(() => {
      removeHistory(item.url);
      setRemoving((prev) => {
        const next = new Set(prev);
        next.delete(item.url);
        return next;
      });
    }, COLLAPSE_MS);
    showToast({
      message: "Dihapus dari riwayat.",
      action: { label: "Urungkan", onClick: () => restoreHistory(item) },
      duration: 6000,
    });
  }

  function openActions(item: HistoryItem) {
    haptic("tap");
    setSelected(item);
    setActionsOpen(true);
  }

  async function copyLink(url: string) {
    setActionsOpen(false);
    try {
      await navigator.clipboard.writeText(url);
      showToast({ message: "Link disalin.", tone: "success", duration: 2500 });
    } catch {
      showToast({ message: "Browser menolak akses clipboard. Buka postingannya lalu salin dari sana.", tone: "danger" });
    }
  }

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[clamp(1.75rem,7vw,2.25rem)] leading-tight font-extrabold tracking-tight">Riwayat</h1>
        <p className="mt-1 text-sm text-muted">Hanya tersimpan di perangkat ini. Tekan sebuah link untuk menyimpannya lagi.</p>
      </div>
      {items && items.length > 0 && (
        <button type="button" onClick={() => setClearOpen(true)} className="neu-btn px-4 text-sm">
          <TrashIcon size={16} />
          Hapus semua
        </button>
      )}
    </div>
  );

  let body;
  if (items === null) {
    body = (
      <div className="flex items-center gap-3 py-10 text-sm text-muted" role="status">
        <span className="animate-dimple size-3 rounded-full" aria-hidden="true" />
        Memuat riwayat dari perangkat ini...
      </div>
    );
  } else if (items.length === 0 && !storageAvailable()) {
    body = (
      <div className="neu-panel animate-rise flex items-start gap-3 p-6" role="alert">
        <span className="neu-well grid size-11 shrink-0 place-items-center rounded-xl text-danger">
          <AlertIcon size={20} />
        </span>
        <div>
          <h2 className="font-bold">Riwayat tidak bisa disimpan di browser ini</h2>
          <p className="mt-1 text-sm text-muted">
            Mode privat atau pengaturan browser memblokir penyimpanan. Membaca link dan menyimpan file tetap jalan seperti biasa.
          </p>
        </div>
      </div>
    );
  } else if (items.length === 0) {
    body = (
      <div className="neu-well flex flex-col items-center gap-4 rounded-[1.75rem] px-6 py-12 text-center">
        <span className="neu-btn pointer-events-none size-16 rounded-2xl text-muted" aria-hidden="true">
          <HistoryIcon size={28} />
        </span>
        <div>
          <h2 className="text-lg font-bold">Belum ada riwayat</h2>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
            Setiap link yang berhasil dibaca muncul di sini, jadi kamu bisa menyimpannya lagi tanpa mencari postingannya.
          </p>
        </div>
        <Link href="/" transitionTypes={["nav-back"]} className="neu-primary mt-2 px-6">
          Tempel link
        </Link>
      </div>
    );
  } else {
    body = (
      <div className="grid gap-7">
        {groupByDay(items).map((group) => (
          <section key={group.label} aria-label={group.label}>
            <h2 className="px-1 text-sm font-semibold text-muted">{group.label}</h2>
            <ul className="neu-panel mt-3 overflow-hidden rounded-[1.5rem] p-1.5">
              {group.items.map((item) => (
                <HistoryRow key={item.url} item={item} removing={removing.has(item.url)} onActions={openActions} onDelete={remove} />
              ))}
            </ul>
          </section>
        ))}
        <p className="px-1 text-xs text-muted">Menyimpan sampai 60 link terakhir. Pada perangkat sentuh, geser baris ke kiri untuk menghapus.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-7 pt-2 pb-12 sm:pt-6 lg:pt-12">
      {header}
      {body}

      <Sheet
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        title={selected?.title ?? ""}
        description={selected ? `${hostOf(selected.url)} · dibaca ${fullFormat.format(selected.at)}` : undefined}
      >
        {selected && (
          <div className="grid gap-3">
            <Link
              href={reopenHref(selected.url)}
              transitionTypes={["nav-back"]}
              onClick={() => setActionsOpen(false)}
              className="neu-primary px-5"
            >
              <RetryIcon size={18} />
              Baca lagi dan simpan
            </Link>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => copyLink(selected.url)} className="neu-btn px-3 text-sm">
                <CopyIcon size={16} />
                Salin link
              </button>
              <a href={selected.url} target="_blank" rel="noopener noreferrer" onClick={() => setActionsOpen(false)} className="neu-btn px-3 text-sm">
                <ExternalIcon size={16} />
                Buka postingan
              </a>
            </div>
            <button
              type="button"
              onClick={() => {
                setActionsOpen(false);
                remove(selected);
              }}
              className="neu-btn px-4 text-sm text-danger hover:text-danger"
            >
              <TrashIcon size={16} />
              Hapus dari riwayat
            </button>
          </div>
        )}
      </Sheet>

      <ClearHistorySheet open={clearOpen} onClose={() => setClearOpen(false)} count={items?.length ?? 0} />
    </div>
  );
}
