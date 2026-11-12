import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-xl items-center justify-between py-4 sm:py-6 lg:max-w-none">
      <Link href="/" className="inline-flex min-h-11 items-center rounded-lg px-1 text-xl font-extrabold tracking-tight" aria-label="WeeLink, halaman utama">
        Wee<span className="text-accent">Link</span>
      </Link>
      <ThemeToggle />
    </header>
  );
}
