import { AlertIcon, LinkIcon, RetryIcon } from "@/components/ui/icons";
import type { Platform } from "@/lib/platforms";

export function EmptyPanel() {
  return (
    <div className="neu-well flex min-h-[26rem] flex-col items-center justify-center gap-4 rounded-[1.75rem] p-8 text-center">
      <span className="neu-btn pointer-events-none size-16 rounded-2xl text-muted" aria-hidden="true">
        <LinkIcon size={28} />
      </span>
      <div>
        <h2 className="text-lg font-bold">Hasilnya muncul di sini</h2>
        <p className="mt-1 max-w-xs text-sm text-muted">Tempel link postingan publik di kolom kiri, lalu tekan Ambil media.</p>
      </div>
    </div>
  );
}

export function ResolvingPanel({ platform, onCancel }: { platform: Platform | null; onCancel: () => void }) {
  return (
    <div className="neu-panel animate-rise flex flex-col items-center gap-5 p-8 text-center" role="status">
      <div className="flex gap-3" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className="animate-dimple size-4 rounded-full" style={{ animationDelay: `${i * 160}ms` }} />
        ))}
      </div>
      <p className="font-semibold">
        Membaca link {platform && platform.id !== "other" ? platform.name : "postingan"}
      </p>
      <button type="button" onClick={onCancel} className="neu-btn px-5 text-sm">
        Batal
      </button>
    </div>
  );
}

interface ErrorPanelProps {
  message: string;
  onRetry: () => void;
  onChangeLink: () => void;
}

export function ErrorPanel({ message, onRetry, onChangeLink }: ErrorPanelProps) {
  return (
    <div className="neu-panel animate-rise p-6 sm:p-8" role="alert">
      <div className="flex items-start gap-3">
        <span className="neu-well grid size-11 shrink-0 place-items-center rounded-xl text-danger">
          <AlertIcon size={20} />
        </span>
        <div>
          <h2 className="text-lg font-bold">Belum berhasil</h2>
          <p className="mt-1 text-muted">{message}</p>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button type="button" onClick={onRetry} className="neu-btn px-4">
          <RetryIcon size={18} />
          Coba lagi
        </button>
        <button type="button" onClick={onChangeLink} className="neu-btn px-4">
          Ganti link
        </button>
      </div>
    </div>
  );
}
