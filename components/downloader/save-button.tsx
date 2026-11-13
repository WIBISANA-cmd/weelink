"use client";

import { AlertIcon, CheckIcon, SaveIcon, ShareIcon } from "@/components/ui/icons";
import type { DownloadState } from "@/hooks/use-file-download";
import { isIOS } from "@/lib/pwa";

interface SaveButtonProps {
  label: string;
  state: DownloadState;
  onSave: () => void;
  onCancel: () => void;
}

function buttonText(state: DownloadState, label: string, compact: boolean) {
  switch (state.status) {
    case "preparing":
      return "Menyiapkan file...";
    case "receiving":
      return state.progress === null ? "Mengunduh..." : `Mengunduh ${state.progress}%`;
    case "done":
      // Next to Bagikan the row is tight on a 320px phone; the label above already names the quality.
      return compact ? "Simpan lagi" : `Simpan ${label} lagi`;
    case "error":
      return "Coba simpan lagi";
    default:
      return `Simpan ${label}`;
  }
}

function canShareFile(file: File) {
  try {
    return typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

async function shareFile(file: File) {
  try {
    await navigator.share({ files: [file], title: file.name });
  } catch (error) {
    // Closing the share sheet rejects with AbortError; that is a choice, not a failure.
    if ((error as DOMException)?.name !== "AbortError") console.error(error);
  }
}

export function SaveButton({ label, state, onSave, onCancel }: SaveButtonProps) {
  const working = state.status === "preparing" || state.status === "receiving";
  const progress = state.status === "receiving" ? state.progress : null;
  // The share sheet is how phones put a file into the gallery (iPhone: Simpan Video / Simpan Gambar).
  const shareable = state.status === "done" && canShareFile(state.file);

  return (
    <div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={working}
          aria-busy={working}
          className={`${shareable ? "neu-btn min-h-13" : "neu-primary"} relative flex-1 overflow-hidden px-5 text-base disabled:cursor-progress`}
        >
          {working && (
            <span aria-hidden="true" className="absolute inset-y-0 left-0 bg-white/18 transition-[width] duration-300" style={{ width: progress === null ? "40%" : `${progress}%` }}>
              {progress === null && <span className="animate-sweep absolute inset-0 bg-white/10" />}
            </span>
          )}
          <span className="relative flex items-center gap-2">
            {state.status === "done" ? <CheckIcon size={20} /> : <SaveIcon size={20} />}
            {buttonText(state, label, shareable)}
          </span>
        </button>
        {working && (
          <button type="button" onClick={onCancel} className="neu-btn min-h-13 px-4 text-sm">
            Batal
          </button>
        )}
        {shareable && (
          // Once the file exists, sending it on is the next step, so the blue moves here.
          <button type="button" onClick={() => shareFile(state.file)} className="neu-primary animate-pop px-5 text-base">
            <ShareIcon size={20} />
            Bagikan
          </button>
        )}
      </div>

      <p role="status" className="min-h-5 pt-3 text-sm">
        {state.status === "preparing" && <span className="text-muted">Server sedang memproses. Video panjang butuh waktu lebih lama.</span>}
        {state.status === "done" && (
          <span className="text-muted">
            {state.filename} tersimpan. {shareable && isIOS() ? "Untuk menaruhnya di Foto, tekan Bagikan lalu Simpan." : "Cek folder Unduhan."}
          </span>
        )}
        {state.status === "error" && (
          <span className="flex items-start gap-1.5 text-danger">
            <AlertIcon size={16} className="mt-0.5 shrink-0" />
            {state.message}
          </span>
        )}
      </p>
    </div>
  );
}
