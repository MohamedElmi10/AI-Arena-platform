import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type ChatMessage = { role: "user" | "agent"; text: string };

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
};

export function ChatSurface({
  title,
  messages,
  input,
  streaming,
  onInputChange,
  onSubmit,
}: ChatSurfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

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
          <span className="text-neutral-500">{streaming ? "streaming" : "idle"}</span>
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
                      : "whitespace-pre-line rounded-tl-sm border border-neutral-200 bg-white font-display leading-relaxed text-neutral-700"
                  )}
                >
                  {m.text}
                  {showCursor && <span className="ml-0.5 animate-pulse">▊</span>}
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
    </div>
  );
}
