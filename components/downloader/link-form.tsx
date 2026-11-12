"use client";

import { useState, type ClipboardEvent, type FormEvent, type RefObject } from "react";
import { AlertIcon, CloseIcon, PasteIcon } from "@/components/ui/icons";
import { PlatformMark } from "@/components/ui/platform-mark";
import { detectPlatform, extractUrl } from "@/lib/platforms";

interface LinkFormProps {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: (url: string) => void;
  busy: boolean;
  /** The submit stays solid blue only while it is the main action on screen. */
  prominent: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
}

const NOT_A_LINK = "Itu belum berupa link. Di aplikasinya, pilih Bagikan lalu Salin link.";

export function LinkForm({ value, onValueChange, onSubmit, busy, prominent, inputRef }: LinkFormProps) {
  const [hint, setHint] = useState<string | null>(null);
  const url = extractUrl(value);
  const platform = url ? detectPlatform(url) : null;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!url) {
      setHint(value.trim() ? NOT_A_LINK : "Tempel link postingannya dulu.");
      inputRef.current?.focus();
      return;
    }
    setHint(null);
    onSubmit(url);
  }

  // Pasting a link is the whole intent, so skip the extra tap on the submit button.
  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = extractUrl(event.clipboardData.getData("text"));
    if (!pasted || busy) return;
    event.preventDefault();
    onValueChange(pasted);
    setHint(null);
    onSubmit(pasted);
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      const pasted = extractUrl(text);
      onValueChange(pasted ?? text);
      if (pasted) {
        setHint(null);
        onSubmit(pasted);
      } else {
        setHint(NOT_A_LINK);
      }
    } catch {
      inputRef.current?.focus();
      setHint("Browser menolak akses clipboard. Tekan lama kolom ini lalu pilih Tempel.");
    }
  }

  function clear() {
    onValueChange("");
    setHint(null);
    inputRef.current?.focus();
  }

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="link" className="text-sm font-semibold text-muted">
        Link postingan
      </label>

      <div className="neu-field mt-2 flex items-center gap-2 py-1.5 pr-1.5 pl-3.5">
        <span key={platform?.id ?? "none"} className={`grid size-6 shrink-0 place-items-center ${platform ? "animate-pop text-accent" : "text-muted"}`}>
          <PlatformMark id={platform?.id ?? "other"} size={20} />
        </span>
        <input
          ref={inputRef}
          id="link"
          name="link"
          type="url"
          inputMode="url"
          enterKeyHint="go"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={value}
          onChange={(e) => {
            onValueChange(e.target.value);
            if (hint) setHint(null);
          }}
          onPaste={handlePaste}
          placeholder="tiktok.com/@akun/video/..."
          aria-describedby={hint ? "link-hint" : undefined}
          aria-invalid={hint ? true : undefined}
          className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-ink placeholder:text-muted focus-visible:outline-none"
        />
        {value ? (
          <button type="button" onClick={clear} className="neu-btn size-11 shrink-0" aria-label="Hapus link">
            <CloseIcon size={18} />
          </button>
        ) : (
          <button type="button" onClick={pasteFromClipboard} className="neu-btn h-11 shrink-0 px-3.5 text-sm">
            <PasteIcon size={18} />
            Tempel
          </button>
        )}
      </div>

      <p id="link-hint" role="status" className="min-h-6 pt-2 text-sm text-danger">
        {hint && (
          <span className="flex items-start gap-1.5">
            <AlertIcon size={16} className="mt-0.5 shrink-0" />
            {hint}
          </span>
        )}
      </p>

      <button
        type="submit"
        disabled={busy}
        aria-busy={busy}
        className={`${prominent ? "neu-primary" : "neu-btn min-h-13"} mt-2 w-full px-6 text-base`}
      >
        {busy ? "Membaca link..." : "Ambil media"}
      </button>
    </form>
  );
}
