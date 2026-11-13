/**
 * Launch screen, rendered in the HTML so it paints before any JavaScript runs.
 * It only shows when the boot script set data-splash (once per session), and CSS hides it after
 * a few seconds even if hydration never finishes. PwaRuntime dismisses it once the app is ready.
 *
 * The motion is the product's keycap: the W draws onto a raised key, the key is pressed in once,
 * and the track below fills while the app wakes up.
 */
export function SplashScreen() {
  return (
    <div className="splash" aria-hidden="true">
      <div className="splash-key">
        <svg viewBox="0 0 64 64" className="size-full">
          <path
            className="splash-w"
            pathLength={100}
            d="M15 22l7 21 10-17 10 17 7-21"
            fill="none"
            stroke="#fff"
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="splash-word">
        Wee<span className="text-accent">Link</span>
      </p>
      <div className="splash-track">
        <span className="splash-fill" />
      </div>
    </div>
  );
}
