import type { ComponentType } from "react";
import { HistoryIcon, SaveIcon, SettingsIcon } from "@/components/ui/icons";

export interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<{ size?: number }>;
}

/** Order matters: moving right in this list slides the screen forward, moving left slides it back. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Unduh", Icon: SaveIcon },
  { href: "/riwayat", label: "Riwayat", Icon: HistoryIcon },
  { href: "/pengaturan", label: "Pengaturan", Icon: SettingsIcon },
];

export function activeIndex(pathname: string) {
  return NAV_ITEMS.findIndex((item) => (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)));
}

export function directionTo(target: number, current: number) {
  return target >= current ? "nav-forward" : "nav-back";
}
