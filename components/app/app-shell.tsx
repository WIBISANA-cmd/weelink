import Link from "next/link";
import type { ReactNode } from "react";
import { InstallButton } from "@/components/pwa/install-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AppBar } from "./app-bar";
import { AppNav } from "./app-nav";
import { AppShortcuts } from "./app-shortcuts";

/**
 * Phones: app bar on top, tab bar docked at the bottom.
 * From 1024px: a rail on the left, like a desktop app's sidebar, and the content beside it.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      {/* Only visible when the installed desktop app draws its own title bar. */}
      <div className="titlebar" aria-hidden="true">
        WeeLink
      </div>

      <aside className="rail">
        <Link href="/" className="neu-btn size-12 rounded-2xl text-accent" aria-label="WeeLink, layar Unduh">
          <svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">
            <path d="M15 22l7 21 10-17 10 17 7-21" fill="none" stroke="currentColor" strokeWidth={6.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <AppNav variant="rail" />
        <div className="mt-auto flex flex-col items-center gap-4">
          <InstallButton compact />
          <ThemeToggle />
        </div>
      </aside>

      <div className="app-column">
        <AppBar />
        <main id="main" className="app-content">
          {children}
        </main>
      </div>

      <AppNav variant="bar" />
      <AppShortcuts />
    </div>
  );
}
