import type { TileGuide } from "@/data/modules";

// The instructional panel (docs/CONTEXT.md §Playground Guide).
// "Try this" prompts are tap-to-insert buttons that populate the chat input.
//
// Split into two parts so the layout can slot the chat between them on mobile
// (chat right after "Try this"; the reference sections drop below it). On desktop
// both parts stack in the left column. `part` omitted renders everything.
type PlaygroundGuideProps = {
  guide: TileGuide;
  onInsert: (prompt: string, mode?: string) => void;
  part?: "top" | "bottom";
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[color:var(--accent)]">
      {children}
    </div>
  );
}

export function PlaygroundGuide({ guide, onInsert, part }: PlaygroundGuideProps) {
  const showTop = part !== "bottom";
  const showBottom = part !== "top";

  return (
    <div className="space-y-6">
      {showTop ? (
        <>
          <div>
            <SectionLabel>About this demo</SectionLabel>
            <p className="font-display text-base leading-relaxed text-neutral-700">
              {guide.about}
            </p>
          </div>

          <div>
            <SectionLabel>Try this ↓</SectionLabel>
            <div className="space-y-2">
              {guide.tryThis.map((item) => {
                const text = typeof item === "string" ? item : item.text;
                const mode = typeof item === "string" ? undefined : item.mode;
                return (
                <button
                  key={text}
                  type="button"
                  onClick={() => onInsert(text, mode)}
                  className="group flex w-full items-center gap-3 rounded-md border border-[var(--accent)]/30 bg-[var(--accent-tint)] px-3 py-2.5 text-left transition hover:-translate-y-[1px] hover:border-[var(--accent)] hover:shadow-sm"
                >
                  <span className="flex-1 font-display text-sm italic leading-snug text-neutral-700 group-hover:text-neutral-900">
                    &ldquo;{text}&rdquo;
                  </span>
                  <span className="shrink-0 rounded bg-[var(--accent)] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-white opacity-0 transition group-hover:opacity-100">
                    try →
                  </span>
                </button>
                );
              })}
            </div>
          </div>
        </>
      ) : null}

      {showBottom ? (
        <>
          <div>
            <SectionLabel>What to expect</SectionLabel>
            <ul className="ml-5 list-outside list-disc space-y-1.5 text-sm text-neutral-700">
              {guide.expect.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-[0.25em] text-[color:var(--accent)]">
              Under the hood
            </summary>
            <ul className="ml-5 mt-2 list-outside list-disc space-y-1.5 text-neutral-600">
              {guide.hood.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </details>
        </>
      ) : null}
    </div>
  );
}
