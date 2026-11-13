import type { Metadata } from "next";
import Link from "next/link";
import { Screen } from "@/components/app/screen";
import { ReloadButton } from "@/components/pwa/reload-button";
import { CloudOffIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false },
};

/** The service worker serves this when a screen was never cached and the network is gone. */
export default function OfflinePage() {
  return (
    <Screen className="mx-auto w-full max-w-md">
      <div className="neu-well mt-6 flex flex-col items-center gap-5 rounded-[1.75rem] px-6 py-10 text-center lg:mt-16">
        <span className="neu-btn pointer-events-none size-16 rounded-2xl text-muted" aria-hidden="true">
          <CloudOffIcon size={28} />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Kamu sedang offline</h1>
          <p className="mt-2 text-muted">
            Membaca link dan menyimpan file butuh internet. Begitu tersambung lagi, coba muat ulang.
          </p>
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-2">
          <ReloadButton />
          <Link href="/riwayat" className="neu-btn px-4">
            Buka Riwayat
          </Link>
        </div>
      </div>
    </Screen>
  );
}
