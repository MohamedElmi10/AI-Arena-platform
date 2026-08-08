import { cn } from "@/lib/utils";

// Tech attribution (T-017). Wordmark TEXT + our OWN neutral spark glyph.
// Deliberately NOT a Microsoft/Azure logo — third parties may use the product
// *names* (wordmarks) to truthfully state what powers the app, but not the
// marks/logos without a license. See tickets/done/T-017-* and the footer note.

/** A neutral four-point spark — our own mark, not any brand's logo. */
function Spark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      fill="currentColor"
      className={className}
    >
      <path d="M8 0l1.7 6.3L16 8l-6.3 1.7L8 16l-1.7-6.3L0 8l6.3-1.7z" />
    </svg>
  );
}

type PoweredByProps = {
  /** The Azure service wordmark, e.g. "Azure AI Foundry". */
  service: string;
  /** Optional lead-in, e.g. "Powered by" (playground) or "Built on" (hero).
   *  Omit for a bare wordmark (tiles). */
  prefix?: string;
  className?: string;
};

export function PoweredBy({ service, prefix, className }: PoweredByProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest",
        className
      )}
    >
      <Spark className="size-3 shrink-0 opacity-80" />
      <span>
        {prefix ? `${prefix} ` : ""}
        {service}
      </span>
    </span>
  );
}
