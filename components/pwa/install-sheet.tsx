"use client";

import type { ReactNode } from "react";
import { AddSquareIcon, CheckIcon, ShareIcon } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { closeInstallSheet, usePwa } from "./pwa-store";

interface Step {
  /** The glyph Safari shows for this step; steps in a text menu get their number instead. */
  icon?: ReactNode;
  text: ReactNode;
}

// Safari has no install prompt an app can trigger, so these are the menu steps, as Safari labels them.
const IOS_STEPS: Step[] = [
  {
    icon: <ShareIcon size={20} />,
    text: (
      <>
        Tekan tombol <b>Bagikan</b> di bar Safari (di bawah pada iPhone, di atas pada iPad).
      </>
    ),
  },
  {
    icon: <AddSquareIcon size={20} />,
    text: (
      <>
        Gulir daftarnya, lalu pilih <b>Tambah ke Layar Utama</b>.
      </>
    ),
  },
  {
    icon: <CheckIcon size={20} />,
    text: (
      <>
        Tekan <b>Tambah</b>. WeeLink muncul di Layar Utama dan terbuka tanpa bar browser.
      </>
    ),
  },
];

const MAC_STEPS: Step[] = [
  {
    text: (
      <>
        Di bar menu Safari, buka <b>File</b>.
      </>
    ),
  },
  {
    text: (
      <>
        Pilih <b>Tambahkan ke Dock</b>, lalu <b>Tambah</b>. Butuh Safari 17 atau lebih baru.
      </>
    ),
  },
];

export function InstallSheet() {
  const { install, installSheetOpen } = usePwa();
  const mac = install === "mac-safari";
  const steps = mac ? MAC_STEPS : IOS_STEPS;

  return (
    <Sheet
      open={installSheetOpen}
      onClose={closeInstallSheet}
      title={mac ? "Pasang WeeLink di Mac" : "Pasang WeeLink di Layar Utama"}
      description={
        mac
          ? "WeeLink akan terbuka di jendelanya sendiri, langsung dari Dock."
          : "Safari belum punya tombol pasang otomatis. Langkah ini menaruh WeeLink di Layar Utama."
      }
    >
      <ol className="grid gap-3">
        {steps.map((step, i) => (
          <li key={i} className="flex items-center gap-3.5">
            <span className="neu-well grid size-12 shrink-0 place-items-center rounded-2xl text-accent">
              {step.icon ?? <span className="text-base font-extrabold tabular-nums">{i + 1}</span>}
            </span>
            <p className="text-sm leading-snug">
              <span className="sr-only">Langkah {i + 1}: </span>
              {step.text}
            </p>
          </li>
        ))}
      </ol>
      <button type="button" onClick={closeInstallSheet} className="neu-btn mt-6 w-full px-4">
        Mengerti
      </button>
    </Sheet>
  );
}
