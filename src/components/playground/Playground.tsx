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

// The Split playground (docs/CONTEXT.md §Playground Layout). Orchestrator: owns
// the chat + live-stats state and drives a FAKE character-by-character stream so
// the layout works before Azure is wired (real stream lands in T-007).
type PlaygroundProps = {
  module: Module;
  tile: Tile;
  guide: TileGuide;
  chapter: number;
};

// Throwaway canned reply — replaced by the real Foundry stream in T-007.
const CANNED =
  "AI Arena is my working portfolio — every tile is a live Azure AI agent or gen-AI demo I built while studying for AI-102 and AI-103. This tile is the baseline: a Foundry-hosted chat agent with streaming, no memory, no tools. The rest come online as I build them.";

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

  async function runFakeStream() {
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
    let acc = "";
    for (const ch of CANNED) {
      acc += ch;
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "agent", text: acc };
        return next;
      });
      setTokens(acc.length);
      setLatency(`${Math.round(performance.now() - start)}ms`);
      await new Promise((r) => setTimeout(r, 12 + Math.random() * 22));
    }

    setStatus("idle");
    streamingRef.current = false;
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
            onSubmit={runFakeStream}
          />
        </div>
      </div>
    </main>
  );
}
