"use client";

import { InstallIcon } from "@/components/ui/icons";
import { haptic } from "@/lib/settings";
import { promptInstall, usePwa } from "./pwa-store";

/** Only rendered when this browser can actually install; no dead button in Firefox or once installed. */
export function InstallButton({ compact = false }: { compact?: boolean }) {
  const { install } = usePwa();
  if (install !== "prompt" && install !== "ios" && install !== "mac-safari") return null;

  return (
    <button
      type="button"
      onClick={() => {
        haptic("tap");
        promptInstall();
      }}
      className={`neu-btn animate-pop ${compact ? "size-11 rounded-full" : "h-11 px-3.5 text-sm"}`}
      aria-label={compact ? "Pasang aplikasi WeeLink" : undefined}
      title={compact ? "Pasang aplikasi" : undefined}
    >
      <InstallIcon size={18} />
      {!compact && "Pasang"}
    </button>
  );
}
