// "How it works" — the runtime path (docs/CONTEXT.md §Runtime Path), drawn with
// the official Azure AI Foundry architecture icon.
//
// Brand compliance: Azure architecture icons are permitted in diagrams and
// documentation with the product name shown near the icon (see
// public/icons/NOTICE.md). The icon is used as-is and is NOT used to brand AI
// Arena itself. No Microsoft *logos* are used anywhere (those need a license).

type NodeProps = {
  label: string;
  sublabel: string;
  /** Optional official Azure icon (public/icons/*). Non-Azure nodes have none. */
  icon?: string;
  iconAlt?: string;
};

function Node({ label, sublabel, icon, iconAlt }: NodeProps) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2 rounded-md border border-neutral-300 bg-white/70 px-4 py-4 text-center">
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon} alt={iconAlt ?? label} width={28} height={28} />
      ) : (
        <span aria-hidden="true" className="text-lg">
          ◇
        </span>
      )}
      <span className="font-display text-sm font-semibold leading-tight text-neutral-900">
        {label}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
        {sublabel}
      </span>
    </div>
  );
}

function Arrow({ label }: { label: string }) {
  return (
    <div className="flex shrink-0 flex-col items-center justify-center gap-1 md:px-1">
      <span
        aria-hidden="true"
        className="rotate-90 text-neutral-400 md:rotate-0"
      >
        →
      </span>
      <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-400">
        {label}
      </span>
    </div>
  );
}

export function ArchitectureDiagram() {
  return (
    <section className="mt-20">
      <div className="mb-6">
        <div className="inline-block rounded bg-neutral-900 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-white">
          How it works
        </div>
        <p className="mt-3 max-w-3xl font-display text-lg leading-relaxed text-neutral-700">
          Every demo follows the same shape: your browser never sees an Azure
          key — the Next.js route calls Azure server-side (wrapped in
          cost-safety) and streams the reply back token by token. Only the
          Azure service at the end changes per tile.
        </p>
      </div>

      <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
        <Node label="Your browser" sublabel="the playground" />
        <Arrow label="prompt" />
        <Node
          label="Next.js API route"
          sublabel="withCostSafety · key server-side"
        />
        <Arrow label="server-side" />
        <Node
          label="Azure AI Foundry"
          sublabel="gpt-5-mini · the live example"
          icon="/icons/azure-ai-foundry.svg"
          iconAlt="Azure AI Foundry"
        />
      </div>

      <p className="mt-4 font-mono text-xs text-neutral-500">
        <span
          aria-hidden="true"
          className="inline-block rotate-90 md:rotate-0"
        >
          ←
        </span>{" "}
        Tokens stream back along the same path, rendered live in the chat.
      </p>
    </section>
  );
}
