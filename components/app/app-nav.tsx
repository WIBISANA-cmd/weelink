"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import { haptic } from "@/lib/settings";
import { NAV_ITEMS, activeIndex, directionTo } from "./nav-items";

/**
 * The tabs are keycaps on one plate. A single sunken well slides under the active key,
 * so switching screens reads as pressing a different key, not as a color change.
 */
export function AppNav({ variant }: { variant: "bar" | "rail" }) {
  const pathname = usePathname();
  const active = activeIndex(pathname);

  return (
    <nav aria-label="Navigasi utama" className={variant === "bar" ? "tabbar" : "rail-nav"}>
      <div className="nav-plate" style={{ "--active": Math.max(active, 0), "--count": NAV_ITEMS.length } as CSSProperties}>
        {active >= 0 && <span className="nav-well" aria-hidden="true" />}
        <ul className="nav-keys">
          {NAV_ITEMS.map(({ href, label, Icon }, i) => {
            const current = i === active;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={current ? "page" : undefined}
                  transitionTypes={current ? undefined : [directionTo(i, active)]}
                  onClick={() => haptic("tap")}
                  className="nav-key"
                >
                  <span className="nav-icon" key={current ? "on" : "off"}>
                    <Icon size={22} />
                  </span>
                  <span className="nav-label">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
