import { cn } from "@/lib/utils";

// The Model / Tokens / Latency / Status bar under the title (docs/CONTEXT.md
// §Playground Layout). Values are fed live from the (currently fake) stream.
export type StreamStatus = "idle" | "streaming";

type LiveStatsProps = {
  model: string;
  tokens: number;
  latency: string;
  status: StreamStatus;
};

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded border border-[var(--accent)] bg-white px-3 py-2">
      <div className="text-[9px] uppercase tracking-widest text-[color:var(--accent)]">
        {label}
      </div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}

export function LiveStats({ model, tokens, latency, status }: LiveStatsProps) {
  return (
    <div className="mb-8 flex flex-wrap gap-3 font-mono text-xs text-neutral-900">
      <Stat label="Model" value={model} />
      <Stat label="Tokens" value={tokens} />
      <Stat label="Latency" value={latency} />
      <Stat
        label="Status"
        value={
          <span
            className={cn(
              "font-semibold",
              status === "streaming"
                ? "text-[color:var(--accent)]"
                : "text-emerald-600"
            )}
          >
            {status}
          </span>
        }
      />
    </div>
  );
}
