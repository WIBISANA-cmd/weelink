import { Suspense } from "react";
import { Screen } from "@/components/app/screen";
import { Downloader } from "@/components/downloader/downloader";
import { SharedLinkDownloader } from "@/components/downloader/shared-link-downloader";
import { SiteFooter } from "@/components/site/site-footer";

export default function Home() {
  return (
    <Screen className="mx-auto w-full max-w-6xl">
      {/* Search params are only known in the browser; the static shell renders the plain form. */}
      <Suspense fallback={<Downloader />}>
        <SharedLinkDownloader />
      </Suspense>
      <SiteFooter />
    </Screen>
  );
}
