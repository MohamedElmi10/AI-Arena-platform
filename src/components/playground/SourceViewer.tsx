"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Markdown } from "./Markdown";

// Modal that shows a cited corpus file in-app (T-019 Part B). Keeps a visitor in
// the playground instead of bouncing them to raw GitHub. Built on the shared
// shadcn Dialog (Radix) for focus-trap, aria-modal, Escape/overlay close, and
// scroll-lock — same primitive Tile.tsx uses. Content comes from
// GET /api/corpus/<file> (whitelisted read) and reuses the Markdown renderer.
// accentVars is passed in because Radix portals to <body>, outside the accent
// scope Playground sets on <main>.
export function SourceViewer({
  file,
  onClose,
  accentVars,
}: {
  file: string | null;
  onClose: () => void;
  accentVars?: CSSProperties;
}) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!file) return;
    setText(null);
    setError(false);
    let alive = true;
    fetch(`/api/corpus/${encodeURIComponent(file)}`)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error("not ok"))))
      .then((t) => alive && setText(t))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [file]);

  return (
    <Dialog open={file !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent style={accentVars} className="max-h-[80vh] gap-3 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-mono text-xs text-[color:var(--accent-fg)]">
            source · {file}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto pr-1 text-sm leading-relaxed text-neutral-700">
          {error ? (
            <p className="text-neutral-500">Couldn’t load this source.</p>
          ) : text === null ? (
            <p className="text-neutral-400">Loading…</p>
          ) : (
            <Markdown>{text}</Markdown>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
