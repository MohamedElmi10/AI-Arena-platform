import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { Source } from "@/lib/sse";
import { Markdown } from "./Markdown";
import { SourceViewer } from "./SourceViewer";

export type ChatMessage = {
  role: "user" | "agent";
  text: string;
  /** Cited corpus sources for a RAG answer (T-019 Part B). Absent on other tiles. */
  sources?: Source[];
};

// The right-hand chat panel (docs/prototypes/playground-split.html). Purely
// presentational — the Playground orchestrator owns the state and the (fake)
// stream; this renders messages, a blinking cursor while streaming, and the input.
type ChatSurfaceProps = {
  title: string;
  messages: ChatMessage[];
  input: string;
  streaming: boolean;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  /** Optional streaming-mode toggle in the header (e.g. sync/async — T-016). */
  modes?: { label: string; value: string }[];
  mode?: string;
  onModeChange?: (value: string) => void;
  /** Accent CSS vars — forwarded to the portaled SourceViewer modal. */
  accentVars?: CSSProperties;
};

export function ChatSurface({
  title,
  messages,
  input,
  streaming,
  onInputChange,
  onSubmit,
  modes,
  mode,
  onModeChange,
  accentVars,
}: ChatSurfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Which cited source (if any) is open in the viewer modal.
  const [openSource, setOpenSource] = useState<string | null>(null);

  // Keep the newest message in view as it streams.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div className="col-span-12 md:col-span-7">
      <div className="flex h-[560px] flex-col rounded-md border-2 border-[var(--accent)] bg-white">
        <div className="flex items-center justify-between border-b border-neutral-200 bg-[var(--accent-tint)] px-4 py-2 font-mono text-xs">
          <span className="text-[color:var(--accent-fg)]">chat · {title}</span>
          <div className="flex items-center gap-3">
            {modes && mode && onModeChange ? (
              <div className="flex overflow-hidden rounded border border-[var(--accent)] text-[10px] font-semibold uppercase tracking-wider">
                {modes.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => onModeChange(m.value)}
                    disabled={streaming}
                    className={cn(
                      "px-2 py-1 transition disabled:opacity-50",
                      mode === m.value
                        ? "bg-[var(--accent)] text-white"
                        : "bg-white text-[color:var(--accent)]"
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            ) : null}
            <span className="text-neutral-500">{streaming ? "streaming" : "idle"}</span>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-5">
          {messages.map((m, i) => {
            const isLast = i === messages.length - 1;
            const showCursor = streaming && isLast && m.role === "agent";
            return (
              <div
                key={i}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                    m.role === "user"
                      ? "rounded-tr-sm bg-[var(--accent)] text-white"
                      : "rounded-tl-sm border border-neutral-200 bg-white font-display leading-relaxed text-neutral-700"
                  )}
                >
                  {m.role === "agent" ? (
                    <>
                      <Markdown
                        trailing={
                          showCursor ? (
                            <span className="ml-0.5 animate-pulse">▊</span>
                          ) : null
                        }
                      >
                        {m.text}
                      </Markdown>
                      {m.sources && m.sources.length > 0 ? (
                        <div className="mt-2.5 border-t border-neutral-100 pt-2">
                          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                            Sources
                          </p>
                          <ul className="flex flex-wrap gap-1.5">
                            {m.sources.map((s) => (
                              <li key={s.title}>
                                <button
                                  type="button"
                                  onClick={() => setOpenSource(s.title)}
                                  className="rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-mono text-[11px] text-[color:var(--accent)] transition hover:bg-[var(--accent-tint)]"
                                >
                                  {s.title}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    m.text
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="flex gap-2 border-t border-neutral-200 bg-neutral-50 p-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Type a message…"
            autoComplete="off"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={streaming}
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>

      <SourceViewer
        file={openSource}
        onClose={() => setOpenSource(null)}
        accentVars={accentVars}
      />
    </div>
  );
}
