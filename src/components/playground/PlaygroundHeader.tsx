import Link from "next/link";
import { LiveStats, type StreamStatus } from "@/components/playground/LiveStats";

// Sticky breadcrumb + editorial title block + the live-stats bar
// (docs/prototypes/playground-split.html). Presentational; the stats values
// come from the Playground orchestrator's fake stream.
type PlaygroundHeaderProps = {
  chapterLabel: string; // e.g. "Chapter 01 · Agents"
  moduleName: string;
  title: string;
  tagline: string;
  model: string;
  tokens: number;
  latency: string;
  status: StreamStatus;
};

export function PlaygroundHeader({
  chapterLabel,
  title,
  tagline,
  model,
  tokens,
  latency,
  status,
}: PlaygroundHeaderProps) {
  return (
    <>
      <div className="sticky top-0 z-30 border-b border-neutral-200 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 text-sm">
          <div className="flex items-center gap-2 font-mono text-neutral-500">
            <Link href="/" className="hover:text-neutral-900">
              ← AI Arena
            </Link>
            <span className="text-neutral-300">/</span>
            <span>{chapterLabel}</span>
            <span className="text-neutral-300">/</span>
            <span className="text-neutral-900">{title}</span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[color:var(--accent)]">
            <span className="size-1.5 animate-pulse rounded-full bg-[var(--accent)]" />
            Live
          </span>
        </div>
      </div>

      <div className="mb-6">
        <div className="inline-block rounded bg-[var(--accent-pale)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-[color:var(--accent-fg)]">
          {chapterLabel}
        </div>
        <h1 className="mt-3 font-display text-5xl font-bold leading-tight text-[color:var(--accent-fg)]">
          {title}
        </h1>
        <p className="mt-2 font-display text-lg italic text-neutral-700">
          {tagline}
        </p>
        <div className="mt-4 h-1 w-16 bg-[var(--accent)]" />
      </div>

      <LiveStats
        model={model}
        tokens={tokens}
        latency={latency}
        status={status}
      />
    </>
  );
}
