import { modules, liveCount } from "@/data/modules";
import { PoweredBy } from "@/components/PoweredBy";

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
        Azure AI Engineer — Microsoft AI-103 certified. A working showcase of the
        skills behind the credential.
      </p>

      {/* Certification badge — links to the verified Microsoft Learn credential. */}
      <div className="mt-5">
        <a
          href="https://learn.microsoft.com/api/credentials/share/en-gb/MohamedElmi-4290/A5D54B676DB783A3?sharingId=3105092C8A9E2CA6"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded border border-neutral-900 px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest text-neutral-900 transition hover:bg-neutral-900 hover:text-white"
        >
          Microsoft Certified · Azure AI Apps &amp; Agents Developer (AI-103) →
        </a>
      </div>

      <PoweredBy
        service="Microsoft Azure AI"
        prefix="Built on"
        className="mt-5 text-neutral-500"
      />

      <div className="mt-6 flex gap-6 text-sm">
        <a
          href="https://github.com/MohamedElmi10"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4"
        >
          GitHub →
        </a>
        <a
          href="https://www.linkedin.com/in/-elmi"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4"
        >
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
