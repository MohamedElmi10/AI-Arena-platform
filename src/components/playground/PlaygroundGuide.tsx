import type { TileGuide } from "@/data/modules";

// The left-hand instructional panel (docs/CONTEXT.md §Playground Guide).
// "Try this" prompts are tap-to-insert buttons that populate the chat input.
type PlaygroundGuideProps = {
  guide: TileGuide;
  onInsert: (prompt: string) => void;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[color:var(--accent)]">
      {children}
    </div>
  );
}

export function PlaygroundGuide({ guide, onInsert }: PlaygroundGuideProps) {
  return (
    <aside className="col-span-12 space-y-6 md:col-span-5">
      <div>
        <SectionLabel>About this demo</SectionLabel>
        <p className="font-display text-base leading-relaxed text-neutral-700">
          {guide.about}
        </p>
      </div>

      <div>
        <SectionLabel>Try this — tap to insert</SectionLabel>
        <div className="space-y-1.5">
          {guide.tryThis.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onInsert(prompt)}
              className="w-full rounded border border-neutral-200 px-3 py-2 text-left font-display text-sm italic text-neutral-700 transition hover:translate-x-[3px] hover:bg-[var(--accent-tint)]"
            >
              &ldquo;{prompt}&rdquo;
            </button>
          ))}
        </div>
      </div>

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
    </aside>
  );
}
