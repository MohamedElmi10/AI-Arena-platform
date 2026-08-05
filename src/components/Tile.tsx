"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Module, Tile as TileData } from "@/data/modules";

// One tile on the landing wall (docs/prototypes/landing.html §tileEditorial,
// colored variant). A Live tile links into its playground; a Planned tile opens
// a modal describing what it will demo once built. All 11 ship Planned; T-008
// flips the first to Live by a data edit alone.
type TileProps = {
  tile: TileData;
  module: Module;
  /** The featured tile (tiles[0]) renders enlarged in the bento. */
  featured?: boolean;
};

export function Tile({ tile, module, featured = false }: TileProps) {
  const [open, setOpen] = useState(false);
  const isLive = tile.status === "live";

  const accentVars = {
    "--accent": module.color.accent,
    "--accent-fg": module.color.fg,
    "--accent-bg": module.color.bg,
    "--accent-tint": module.color.tint,
  } as CSSProperties;

  // Structural styling is Tailwind; only the per-module accent flows through the
  // CSS variables set above (ADR/CONTEXT: colour is the one thing that varies).
  const card = cn(
    "group flex h-full cursor-pointer flex-col rounded-md border-2 transition duration-200 hover:-translate-y-0.5",
    featured ? "min-h-[240px] p-8" : "min-h-[140px] p-5",
    isLive
      ? "bg-[var(--accent-tint)] border-[var(--accent)] hover:shadow-xl"
      : "border-dashed border-[var(--accent-bg)] bg-[var(--accent-tint)]/40 hover:shadow-lg"
  );

  const body = (
    <div className={card} style={accentVars}>
      <div className="mb-3 flex items-center justify-between">
        {isLive ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-[color:var(--accent)]">
            <span className="size-1.5 animate-pulse rounded-full bg-[var(--accent)]" />
            Live
          </span>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--accent-fg)]/60">
            ○ Planned
          </span>
        )}
        <span
          className={cn(
            "font-mono text-[10px]",
            isLive ? "text-[color:var(--accent)]" : "text-neutral-400"
          )}
        >
          {tile.tag}
        </span>
      </div>

      <h3
        className={cn(
          "font-display font-semibold leading-tight",
          featured ? "text-2xl" : "text-base",
          isLive ? "text-[color:var(--accent-fg)]" : "text-neutral-500"
        )}
      >
        {tile.title}
      </h3>

      {/* Description: always for Live, and for the featured Planned tile. */}
      {(isLive || featured) && (
        <p
          className={cn(
            "mt-3 text-sm leading-relaxed",
            isLive ? "text-neutral-600" : "italic text-neutral-400"
          )}
        >
          {tile.desc}
        </p>
      )}

      {/* Live-only: example prompt revealed on hover. */}
      {isLive && (
        <div className="max-h-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:mt-3 group-hover:max-h-16 group-hover:opacity-100">
          <div className="rounded border-l-2 border-[var(--accent)] bg-[var(--accent-tint)] px-3 py-2 font-mono text-xs italic text-[color:var(--accent-fg)]">
            {tile.preview ?? "Click to try this agent →"}
          </div>
        </div>
      )}

      {isLive && (
        <div className="mt-auto pt-4 font-mono text-xs text-[color:var(--accent)]">
          Open agent →
        </div>
      )}
    </div>
  );

  // Live → navigate to the playground route. Planned → open the modal.
  if (isLive) {
    return (
      <Link
        href={`/${module.id}/${tile.slug}`}
        className="block h-full focus:outline-none"
      >
        {body}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block h-full text-left focus:outline-none"
      >
        {body}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent style={accentVars}>
          <DialogHeader>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--accent-fg)]/60">
              Planned · {module.name}
            </span>
            <DialogTitle className="font-display text-2xl">
              {tile.title}
            </DialogTitle>
            <DialogDescription className="text-neutral-600">
              {tile.desc}
            </DialogDescription>
          </DialogHeader>
          <p className="border-t border-neutral-200 pt-4 text-xs text-neutral-500">
            This tile will demo the concept when built. Come back soon.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
