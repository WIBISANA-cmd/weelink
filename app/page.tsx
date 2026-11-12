import { Suspense } from "react";
import { Downloader } from "@/components/downloader/downloader";
import { SharedLinkDownloader } from "@/components/downloader/shared-link-downloader";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:px-6 lg:px-10">
      <SiteHeader />
      <main id="main" className="flex-1">
        {/* Search params are only known in the browser; the static shell renders the plain form. */}
        <Suspense fallback={<Downloader />}>
          <SharedLinkDownloader />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
