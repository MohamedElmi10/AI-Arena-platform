"use client";

import { useRef, useState, type CSSProperties } from "react";
import type { Module, Tile, TileGuide } from "@/data/modules";
import { PlaygroundHeader } from "@/components/playground/PlaygroundHeader";
import { PlaygroundGuide } from "@/components/playground/PlaygroundGuide";
import {
  ChatSurface,
  type ChatMessage,
} from "@/components/playground/ChatSurface";
import type { StreamStatus } from "@/components/playground/LiveStats";
import { parseSSEFrame, splitSSEFrames } from "@/lib/sse";

// The Split playground (docs/CONTEXT.md §Playground Layout). Orchestrator: owns
// the chat + live-stats state and drives the real Foundry stream (T-007):
// browser → /api/chat/<slug> → Azure → back, parsed as SSE.
type PlaygroundProps = {
  module: Module;
  tile: Tile;
  guide: TileGuide;
  chapter: number;
};

const MODEL = "gpt-5-mini";

export function Playground({ module, tile, guide, chapter }: PlaygroundProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "agent",
      text: "Hello. Ask me anything, or tap a suggested prompt from the guide.",
    },
  ]);
  const [input, setInput] = useState("");
  const [tokens, setTokens] = useState(0);
  const [latency, setLatency] = useState("—");
  const [status, setStatus] = useState<StreamStatus>("idle");
  const streamingRef = useRef(false);

  const accentVars = {
    "--accent": module.color.accent,
    "--accent-fg": module.color.fg,
    "--accent-pale": module.color.bg,
    "--accent-tint": module.color.tint,
  } as CSSProperties;

  const chapterLabel = `Chapter ${String(chapter).padStart(2, "0")} · ${module.name}`;

  // Replace the whole trailing agent bubble's text.
  function setAgentText(text: string) {
    setMessages((prev) => {
      const next = [...prev];
      next[next.length - 1] = { role: "agent", text };
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
    setMessages((prev) => [
      ...prev,
      { role: "user", text },
      { role: "agent", text: "" },
    ]);

    const start = performance.now();
    let firstDelta = true;

    try {
      const res = await fetch(`/api/chat/${tile.slug}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      // Cost-safety gates (kill switch, budget cap) + other non-OK responses
      // arrive as JSON, not a stream. Show the friendly message as the reply.
      if (!res.ok || !res.body) {
        const friendly = await res
          .json()
          .then((b) => b?.message as string | undefined)
          .catch(() => undefined);
        setAgentText(
          friendly ?? "Something went wrong reaching the model. Please try again."
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      let deltaCount = 0;

      // Read the SSE stream frame by frame and update the bubble live.
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { frames, rest } = splitSSEFrames(buffer);
        buffer = rest;

        for (const frame of frames) {
          const event = parseSSEFrame(frame);
          if (!event) continue;

          if ("delta" in event) {
            if (firstDelta) {
              setLatency(`${Math.round(performance.now() - start)}ms`);
              firstDelta = false;
            }
            acc += event.delta;
            deltaCount += 1;
            setAgentText(acc);
            setTokens(deltaCount); // live tick = count of delta events
          } else if ("error" in event) {
            setAgentText(event.message);
          } else if ("done" in event) {
            // Reconcile the live counter to the model's real usage if present.
            if (typeof event.outputTokens === "number") {
              setTokens(event.outputTokens);
            }
          }
        }
      }
    } catch (err) {
      console.error("[playground] stream failed:", err);
      setAgentText(
        "Something went wrong reaching the model. Please try again in a moment."
      );
    } finally {
      setStatus("idle");
      streamingRef.current = false;
    }
  }

  return (
    <main className="paper min-h-full flex-1" style={accentVars}>
      <div className="mx-auto max-w-6xl px-6 pb-10">
        <div className="pt-10">
          <PlaygroundHeader
            chapterLabel={chapterLabel}
            moduleName={module.name}
            title={tile.title}
            tagline={tile.desc}
            model={MODEL}
            tokens={tokens}
            latency={latency}
            status={status}
          />
        </div>

        <div className="grid grid-cols-12 gap-8">
          <PlaygroundGuide guide={guide} onInsert={setInput} />
          <ChatSurface
            title={tile.title}
            messages={messages}
            input={input}
            streaming={status === "streaming"}
            onInputChange={setInput}
            onSubmit={runStream}
          />
        </div>
      </div>
    </main>
  );
}
