"use client";

import { usePathname, useRouter } from "next/navigation";
import { addTransitionType, startTransition, useEffect } from "react";
import { NAV_ITEMS, activeIndex, directionTo } from "./nav-items";

/** Alt+1, Alt+2, Alt+3 switch screens, the way desktop apps switch panes. */
export function AppShortcuts() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const index = ["Digit1", "Digit2", "Digit3"].indexOf(event.code);
      if (index < 0 || index >= NAV_ITEMS.length) return;
      // An open dialog owns the keyboard.
      if (document.querySelector("dialog[open]")) return;
      const current = activeIndex(pathname);
      if (index === current) return;
      event.preventDefault();
      startTransition(() => {
        addTransitionType(directionTo(index, current));
        router.push(NAV_ITEMS[index].href);
      });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pathname, router]);

  return null;
}
