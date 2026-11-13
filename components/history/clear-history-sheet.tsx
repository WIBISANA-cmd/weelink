"use client";

import { TrashIcon } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { clearHistory, historyStore } from "@/lib/history";
import { haptic } from "@/lib/settings";
import { showToast } from "@/lib/toast";

/** Destructive, so it asks first, and the toast still offers a way back. */
export function ClearHistorySheet({ open, onClose, count }: { open: boolean; onClose: () => void; count: number }) {
  function confirm() {
    const snapshot = historyStore.get();
    clearHistory();
    haptic("tap");
    onClose();
    showToast({
      message: "Riwayat dihapus.",
      action: { label: "Urungkan", onClick: () => historyStore.set(snapshot) },
      duration: 6000,
    });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Hapus semua riwayat?"
      description={`${count} link akan dihapus dari perangkat ini. File yang sudah tersimpan tidak ikut terhapus.`}
    >
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={onClose} className="neu-btn px-4">
          Batal
        </button>
        <button type="button" onClick={confirm} className="neu-btn px-4 text-danger hover:text-danger">
          <TrashIcon size={18} />
          Hapus semua
        </button>
      </div>
    </Sheet>
  );
}
