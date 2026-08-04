import { modules, liveCount } from "@/data/modules";

// Editorial masthead for the landing (docs/prototypes/landing.html §heroBase +
// renderColored pills). Server component — no interactivity.
export function Hero() {
  return (
    <header className="mb-16 border-b-2 border-neutral-900 pb-8">
      <div className="mb-6 flex items-baseline justify-between">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-neutral-500">
          Vol. 1 · AI Arena
        </span>
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-neutral-500">
          2026
        </span>
      </div>

      <h1 className="font-display text-6xl font-bold leading-none tracking-tight md:text-7xl">
        Mohamed Elmi
      </h1>

      <p className="mt-4 max-w-3xl font-display text-2xl italic text-neutral-700">
        Azure AI Engineer — a working showcase of what I built on the way to
        AI-102 and AI-103.
      </p>

      <div className="mt-6 flex gap-6 text-sm">
        {/* TODO(Mohamed): confirm your LinkedIn URL. */}
        <a
          href="https://github.com/MohamedElmi10"
          className="underline underline-offset-4"
        >
          GitHub →
        </a>
        <a href="#" className="underline underline-offset-4">
          LinkedIn →
        </a>
      </div>

      {/* Module accent pills — a colour key for the sections below. */}
      <div className="mt-6 flex flex-wrap gap-2">
        {modules.map((mod) => (
          <span
            key={mod.id}
            className="rounded-full border px-3 py-1 font-mono text-xs"
            style={{
              borderColor: mod.color.accent,
              color: mod.color.fg,
              background: mod.color.tint,
            }}
          >
            {mod.name} · {liveCount(mod)}
          </span>
        ))}
      </div>
    </header>
  );
}
