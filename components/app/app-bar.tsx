"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { InstallButton } from "@/components/pwa/install-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

/** Phones and tablets. It lifts off the page only once content scrolls under it. */
export function AppBar() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => ref.current?.toggleAttribute("data-scrolled", window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header ref={ref} className="appbar">
      <Link href="/" className="inline-flex min-h-11 items-center rounded-lg px-1 text-xl font-extrabold tracking-tight" aria-label="WeeLink, layar Unduh">
        Wee<span className="text-accent">Link</span>
      </Link>
      <div className="flex items-center gap-3">
        <InstallButton />
        <ThemeToggle />
      </div>
    </header>
  );
}
