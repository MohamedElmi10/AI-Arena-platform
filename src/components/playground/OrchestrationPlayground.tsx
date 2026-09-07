"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Module, Tile, TileGuide } from "@/data/modules";
import { PlaygroundHeader } from "@/components/playground/PlaygroundHeader";
import { PlaygroundGuide } from "@/components/playground/PlaygroundGuide";
import { Markdown } from "@/components/playground/Markdown";
import type { StreamStatus } from "@/components/playground/LiveStats";
import { SiteFooter } from "@/components/SiteFooter";
import { splitSSEFrames } from "@/lib/sse";

// A bespoke playground, like Vision/Speech. The shared <Playground> renders one
// chat bubble; this tile's whole point is watching THREE agents work in turn, so
// it owns its body and renders a timeline instead — one card per agent step,
// with the handoff between them. Reuses the header, guide and footer.

// The workflow route streams two kinds of event:
//   { step: { id, agent, previous, status } }  — a node started or finished
//   { delta, step }                            — text for the node with that id
// plus { done, outputTokens } and { error, message }.
type OrchEvent =
  | { step: { id?: string; agent?: string; previous?: string; status?: string } }
  | { delta: string; step?: string }
  | { done: true; outputTokens?: number }
  | { error: string; message: string };

type Step = { id: string; agent: string; status: string; text: string };

// Node id (from workflow.yaml) → friendly label. Falls back to the agent name.
const LABELS: Record<string, string> = {
  Researcher: "Researcher Agent",
  Planner: "Itinerary Planner Agent",
  Budget: "Budget & Tips Agent",
  "Trip-Researcher": "Researcher Agent",
  "Trip-Itinerary-Planner": "Itinerary Planner Agent",
  "Trip-Budget-Tips": "Budget & Tips Agent",
};
const labelFor = (s: Step) => LABELS[s.agent] ?? LABELS[s.id] ?? s.agent ?? s.id;

type OrchestrationPlaygroundProps = {
  module: Module;
  tile: Tile;
  guide: TileGuide;
  chapter: number;
};

export function OrchestrationPlayground({
  module,
  tile,
  guide,
  chapter,
}: OrchestrationPlaygroundProps) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [input, setInput] = useState("");
  const [tokens, setTokens] = useState(0);
  const [latency, setLatency] = useState("—");
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const streamingRef = useRef(false);
  // Which step cards are collapsed (by id). Manual toggle; reset each run.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const endRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true); // follow the stream unless the user scrolls up
  const lastScrollRef = useRef(0);

  const accentVars = {
    "--accent": module.color.accent,
    "--accent-fg": module.color.fg,
    "--accent-pale": module.color.bg,
    "--accent-tint": module.color.tint,
  } as CSSProperties;

  const chapterLabel = `Chapter ${String(chapter).padStart(2, "0")} · ${module.name}`;

  // Add a step on its first `step` event, or update status/agent on later ones.
  function toggleCollapsed(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Follow new content while it streams — smooth + throttled for a calm pace —
  // but only while the user is near the bottom. Scroll up to read and it backs
  // off; scroll back down and it resumes.
  useEffect(() => {
    function onScroll() {
      stickRef.current =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 140;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function followNewContent() {
    if (!stickRef.current) return;
    const now = performance.now();
    if (now - lastScrollRef.current < 450) return; // slow, calm pace
    lastScrollRef.current = now;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }

    function upsertStep(s: {
    id?: string;
    agent?: string;
    status?: string;
  }) {
    if (!s.id) return;
    const id = s.id;
    setSteps((prev) => {
      const i = prev.findIndex((p) => p.id === id);
      if (i === -1) {
        return [
          ...prev,
          { id, agent: s.agent ?? id, status: s.status ?? "in_progress", text: "" },
        ];
      }
      const next = [...prev];
      next[i] = {
        ...next[i],
        status: s.status ?? next[i].status,
        agent: s.agent ?? next[i].agent,
      };
      return next;
    });
  }

  function appendDelta(stepId: string | undefined, delta: string) {
    if (!stepId) return;
    setSteps((prev) => {
      const i = prev.findIndex((p) => p.id === stepId);
      if (i === -1) {
        return [...prev, { id: stepId, agent: stepId, status: "in_progress", text: delta }];
      }
      const next = [...prev];
      next[i] = { ...next[i], text: next[i].text + delta };
      return next;
    });
  }

  async function runStream() {
    const text = input.trim();
    if (!text || streamingRef.current) return;

    streamingRef.current = true;
    setInput("");
    setStatus("streaming");
    setTokens(0);
    setLatency("—");
    setErrorMsg(null);
    setSteps([]);
    setCollapsed(new Set());
    stickRef.current = true;

    const start = performance.now();
    let firstDelta = true;
    let deltaCount = 0;

    try {
      const res = await fetch(`/api/chat/${tile.slug}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      // Cost-safety gates + other non-OK responses arrive as JSON, not a stream.
      if (!res.ok || !res.body) {
        const friendly = await res
          .json()
          .then((b) => b?.message as string | undefined)
          .catch(() => undefined);
        setErrorMsg(
          friendly ?? "Something went wrong reaching the workflow. Please try again."
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { frames, rest } = splitSSEFrames(buffer);
        buffer = rest;

        for (const frame of frames) {
          const dataLine = frame.split("\n").find((l) => l.startsWith("data:"));
          if (!dataLine) continue;
          const json = dataLine.slice("data:".length).trim();
          if (!json) continue;
          const event = JSON.parse(json) as OrchEvent;

          // Check delta before step: a delta event also carries an optional
          // `step`, so testing "step" first would wrongly match it.
          if ("delta" in event) {
            if (firstDelta) {
              setLatency(`${Math.round(performance.now() - start)}ms`);
              firstDelta = false;
            }
            deltaCount += 1;
            setTokens(deltaCount); // live tick; reconciled on done
            appendDelta(event.step, event.delta);
            followNewContent();
          } else if ("step" in event) {
            upsertStep(event.step);
            followNewContent();
          } else if ("error" in event) {
            setErrorMsg(event.message);
          } else if ("done" in event) {
            if (typeof event.outputTokens === "number") setTokens(event.outputTokens);
            setSteps((prev) =>
              prev.map((p) =>
                p.status === "in_progress" ? { ...p, status: "completed" } : p
              )
            );
          }
        }
      }
    } catch (err) {
      console.error("[multi-agent] stream failed:", err);
      setErrorMsg(
        "Something went wrong reaching the workflow. Please try again in a moment."
      );
    } finally {
      setStatus("idle");
      streamingRef.current = false;
    }
  }

  const busy = status === "streaming";

  return (
    <main className="paper min-h-full flex-1" style={accentVars}>
      <div className="mx-auto max-w-6xl px-6 pb-10">
        <div className="pt-10">
          <PlaygroundHeader
            chapterLabel={chapterLabel}
            moduleName={module.name}
            title={tile.title}
            tagline={tile.desc}
            poweredBy={tile.poweredBy}
            model={tile.model ?? "gpt-4o"}
            tokens={tokens}
            latency={latency}
            status={status}
          />
        </div>

        <div className="grid grid-cols-12 gap-8 md:items-start">
          {/* One sticky guide column. It used to split into two grid rows with
              the body spanning both — but a long timeline made the bottom half
              drift with the streamed content. Sticky + a single column keeps the
              guide put while the timeline scrolls past it. */}
          <aside className="order-1 col-span-12 space-y-8 md:col-span-5 md:sticky md:top-6">
            <PlaygroundGuide guide={guide} onInsert={setInput} part="top" />
            <PlaygroundGuide guide={guide} onInsert={setInput} part="bottom" />
          </aside>

          <section className="order-2 col-span-12 min-w-0 space-y-4 md:col-span-7">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void runStream();
              }}
              className="flex flex-wrap gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={busy}
                placeholder="e.g. 4 days in Lisbon, love food + history, mid budget"
                className="min-w-0 flex-1 rounded border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="rounded border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "Planning…" : "Plan trip"}
              </button>
            </form>

            <p className="font-mono text-[11px] text-neutral-400">
              Illustrative — not live travel data. Three agents run in sequence;
              each hands its output to the next.
            </p>

            {errorMsg ? (
              <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {errorMsg}
              </p>
            ) : null}

            {steps.length === 0 && busy ? (
              <p className="flex items-center gap-2 font-mono text-xs text-[color:var(--accent)] motion-safe:animate-pulse">
                <span aria-hidden>◍</span> starting the workflow…
              </p>
            ) : null}

            {steps.length === 0 && !busy && !errorMsg ? (
              <p className="font-mono text-xs text-neutral-400">
                Describe a trip above, or tap a suggestion, to watch the three
                agents build the plan.
              </p>
            ) : null}

            <ol className="space-y-0">
              {steps.map((step, i) => {
                const running = step.status === "in_progress";
                const failed = step.status === "failed" || step.status === "cancelled";
                const isCollapsed = collapsed.has(step.id);
                return (
                  <li key={step.id}>
                    {i > 0 ? (
                      <div className="ml-3 flex items-center gap-2 py-1 font-mono text-[11px] text-neutral-400">
                        <span aria-hidden>↓</span> hands off
                      </div>
                    ) : null}
                    <div
                      className={
                        "rounded border bg-white " +
                        (running
                          ? "border-[var(--accent)] shadow-sm"
                          : "border-neutral-200")
                      }
                    >
                      {/* Header is a toggle — click to collapse a finished agent
                          and keep the running one in view. */}
                      <button
                        type="button"
                        onClick={() => toggleCollapsed(step.id)}
                        aria-expanded={!isCollapsed}
                        className="flex w-full items-center gap-2 p-4 text-left"
                      >
                        <span
                          aria-hidden
                          className="w-3 font-mono text-[11px] text-neutral-400"
                        >
                          {isCollapsed ? "▸" : "▾"}
                        </span>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-pale)] font-mono text-[11px] text-[color:var(--accent-fg)]">
                          {i + 1}
                        </span>
                        <span className="text-sm font-semibold text-neutral-900">
                          {labelFor(step)}
                        </span>
                        <span
                          className={
                            "ml-auto font-mono text-[11px] " +
                            (failed
                              ? "text-red-500"
                              : running
                                ? "text-[color:var(--accent)] motion-safe:animate-pulse"
                                : "text-emerald-600")
                          }
                        >
                          {failed
                            ? "failed"
                            : running
                              ? "running…"
                              : "✓ done"}
                        </span>
                      </button>
                      {!isCollapsed ? (
                        <div className="px-4 pb-4">
                          {step.text ? (
                            <div className="text-sm leading-relaxed text-neutral-800">
                              <Markdown>{step.text}</Markdown>
                            </div>
                          ) : (
                            <p className="font-mono text-xs text-neutral-400">
                              working…
                            </p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
            <div ref={endRef} aria-hidden />
          </section>
        </div>

        <SiteFooter />
      </div>
    </main>
  );
}
