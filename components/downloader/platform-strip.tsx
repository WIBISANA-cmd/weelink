import { PlatformMark } from "@/components/ui/platform-mark";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";

/** Recessed wells, not raised keys: these logos inform, they are not buttons. */
export function PlatformStrip({ active }: { active?: PlatformId }) {
  return (
    <div>
      <p className="text-sm text-muted">Bisa dari</p>
      <ul className="mt-3 flex flex-wrap gap-2.5">
        {PLATFORMS.map((p) => (
          <li
            key={p.id}
            title={p.name}
            className={`neu-well grid size-11 place-items-center rounded-xl transition-colors duration-300 ${
              active === p.id ? "text-accent" : "text-muted"
            }`}
          >
            <PlatformMark id={p.id} size={18} />
            <span className="sr-only">{p.name}</span>
          </li>
        ))}
        <li className="flex items-center px-1 text-sm text-muted">dan situs publik lain</li>
      </ul>
    </div>
  );
}
