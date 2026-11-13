"use client";

import { RetryIcon } from "@/components/ui/icons";

export function ReloadButton() {
  return (
    <button type="button" onClick={() => window.location.reload()} className="neu-primary px-5">
      <RetryIcon size={18} />
      Muat ulang
    </button>
  );
}
