import type { CSSProperties } from "react";
import { type Module, liveCount } from "@/data/modules";

// One editorial section per module (docs/prototypes/landing.html
// §renderColoredSection). Tiles land in T-003 — for now the grid holds a
// placeholder note. Structural styling is Tailwind; only the per-module accent
// colours flow through CSS variables set on the <section>.
type ModuleSectionProps = {
  module: Module;
  /** Zero-based index, drives the "Chapter 0N" marker. */
  index: number;
};

export function ModuleSection({ module, index }: ModuleSectionProps) {
  const accentVars = {
    "--accent": module.color.accent,
    "--accent-fg": module.color.fg,
    "--accent-bg": module.color.bg,
    "--accent-tint": module.color.tint,
  } as CSSProperties;

  const chapter = `Chapter ${String(index + 1).padStart(2, "0")}`;

  return (
    <section className="mb-20" style={accentVars}>
      <div className="mb-8 grid grid-cols-12 items-start gap-6">
        <div className="col-span-12 md:col-span-3">
          <div className="inline-block rounded bg-[var(--accent-bg)] px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--accent-fg)]">
            {chapter}
          </div>
          <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-[color:var(--accent-fg)]">
            {module.name}
          </h2>
          <div className="mt-3 font-mono text-xs text-[color:var(--accent)]">
            {liveCount(module)}
          </div>
          <div className="mt-4 h-1 w-16 bg-[var(--accent)]" />
        </div>

        <p className="col-span-12 font-display text-lg leading-relaxed text-neutral-700 md:col-span-9">
          {module.blurb}
        </p>
      </div>

      {/* Placeholder — <Tile> arrives in T-003. */}
      <div className="rounded-lg border border-dashed border-[var(--accent)]/40 bg-[var(--accent-tint)] px-6 py-10 text-center font-mono text-xs uppercase tracking-[0.2em] text-[color:var(--accent)]">
        {module.tiles.length} tiles coming in T-003
      </div>
    </section>
  );
}
