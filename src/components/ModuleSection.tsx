import type { CSSProperties } from "react";
import { type Module, liveCount } from "@/data/modules";
import { Tile } from "@/components/Tile";

// One editorial section per module (docs/prototypes/landing.html
// §renderColoredSection + §renderBento). Structural styling is Tailwind; only
// the per-module accent colours flow through CSS variables set on the <section>.
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

  // Bento: first tile is featured (large), the next two stack beside it, any
  // remainder flows into a three-column row below.
  const [featured, ...rest] = module.tiles;
  const beside = rest.slice(0, 2);
  const below = rest.slice(2);

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

      <div className="grid grid-cols-12 gap-4">
        {featured && (
          <div className="col-span-12 md:col-span-8">
            <Tile tile={featured} module={module} featured />
          </div>
        )}

        {beside.length > 0 && (
          <div className="col-span-12 grid grid-cols-1 gap-4 md:col-span-4">
            {beside.map((tile) => (
              <Tile key={tile.slug} tile={tile} module={module} />
            ))}
          </div>
        )}

        {below.length > 0 && (
          <div className="col-span-12 grid grid-cols-1 gap-4 md:grid-cols-3">
            {below.map((tile) => (
              <Tile key={tile.slug} tile={tile} module={module} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
