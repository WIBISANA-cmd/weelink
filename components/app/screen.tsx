import { ViewTransition, type ReactNode } from "react";

const DIRECTIONAL = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" };

/**
 * Each tab's content. Tabs to the right slide in from the right, tabs to the left from the left,
 * so the screen order in the tab bar is also the spatial order. Untyped transitions (browser back,
 * refresh) swap without motion.
 */
export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ViewTransition enter={DIRECTIONAL} exit={DIRECTIONAL} default="none">
      <div className={className}>{children}</div>
    </ViewTransition>
  );
}
