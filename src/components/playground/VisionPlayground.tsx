"use client";

import { useRef, useState, type CSSProperties } from "react";
import Image, { type StaticImageData } from "next/image";
import type { Module, Tile, TileGuide } from "@/data/modules";
import { PlaygroundHeader } from "@/components/playground/PlaygroundHeader";
import { PlaygroundGuide } from "@/components/playground/PlaygroundGuide";
import {
  ChatSurface,
  type ChatMessage,
} from "@/components/playground/ChatSurface";
import {
  ImageDropzone,
  sampleToDataUrl,
} from "@/components/playground/ImageDropzone";
import type { StreamStatus } from "@/components/playground/LiveStats";
import { SiteFooter } from "@/components/SiteFooter";
import { parseSSEFrame, splitSSEFrames } from "@/lib/sse";

import describeSample from "@/app/vision/vision-chat/images/describe.jpeg";
import readSample from "@/app/vision/vision-chat/images/read.jpeg";
import reasonSample from "@/app/vision/vision-chat/images/reason.png";

// A bespoke playground, like SpeechPlayground. The shared <Playground> posts
// { message } and has nowhere to put a picture; this one owns its body and
// reuses the header, guide and footer.

// One sample per job. A single image cannot carry all three: ask the fruit photo
// to transcribe text and it correctly reports there is none, which reads as a
// broken demo. Image and prompt stay paired here for the same reason build.py
// pairs them.
const SAMPLES: { label: string; image: StaticImageData; prompt: string }[] = [
  {
    label: "describe",
    image: describeSample,
    prompt: "What is in this picture?",
  },
  {
    label: "read",
    image: readSample,
    prompt: "Transcribe every word you can see, then translate it to English.",
  },
  {
    label: "reason",
    image: reasonSample,
    prompt: "Which month fell the most, and by how much?",
  },
];

type VisionPlaygroundProps = {
  module: Module;
  tile: Tile;
  guide: TileGuide;
  chapter: number;
};

export function VisionPlayground({
  module,
  tile,
  guide,
  chapter,
}: VisionPlaygroundProps) {
  const [image, setImage] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "agent",
      text:
        guide.greeting ??
        "Pick one of the pictures below, or drop in your own, then ask me about it.",
    },
  ]);
  const [input, setInput] = useState("");
  const [tokens, setTokens] = useState(0);
  const [latency, setLatency] = useState("—");
  const [status, setStatus] = useState<StreamStatus>("idle");
  // True between sending and the first token. The model reads the whole image
  // before it writes anything — 3 to 4 seconds, on every turn, because the route
  // re-attaches the picture each time. Without this the tile looks frozen.
  const [reading, setReading] = useState(false);
  const streamingRef = useRef(false);

  const accentVars = {
    "--accent": module.color.accent,
    "--accent-fg": module.color.fg,
    "--accent-pale": module.color.bg,
    "--accent-tint": module.color.tint,
  } as CSSProperties;

  function setAgentText(text: string) {
    setMessages((prev) => {
      const next = [...prev];
      next[next.length - 1] = { role: "agent", text };
      return next;
    });
  }

  async function pickSample(sample: (typeof SAMPLES)[number]) {
    // Committed samples go through the same resize path as an upload, so the
    // request looks identical either way.
    setImage(await sampleToDataUrl(sample.image.src));
    setInput(sample.prompt);
  }

  async function runStream() {
    const text = input.trim();
    if (!text || !image || streamingRef.current) return;

    streamingRef.current = true;
    setInput("");
    setStatus("streaming");
    setReading(true);
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
      const history = messages.slice(1).map((m) => ({
        role: m.role === "agent" ? "assistant" : "user",
        content: m.text,
      }));

      const res = await fetch(`/api/chat/${tile.slug}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text, messages: history, image }),
      });

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
              setReading(false);
              firstDelta = false;
            }
            acc += event.delta;
            deltaCount += 1;
            setAgentText(acc);
            setTokens(deltaCount);
          } else if ("error" in event) {
            setAgentText(event.message);
          } else if ("done" in event) {
            if (typeof event.outputTokens === "number") {
              setTokens(event.outputTokens);
            }
          }
        }
      }
    } catch (err) {
      console.error("[vision-chat] stream failed:", err);
      setAgentText(
        "Something went wrong reaching the model. Please try again in a moment."
      );
    } finally {
      setStatus("idle");
      setReading(false);
      streamingRef.current = false;
    }
  }

  const chapterLabel = `Chapter ${String(chapter).padStart(2, "0")} · ${module.name}`;

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
            model={tile.model ?? "gpt-5-mini"}
            tokens={tokens}
            latency={latency}
            status={status}
          />
        </div>

        {/* Same three-slot grid as the shared Playground: guide top, body, guide
            bottom. On mobile the picture and chat sit between the two halves of
            the guide, so "Try this" is still the thing above the input. */}
        <div className="grid grid-cols-12 gap-8">
          <div className="order-1 col-span-12 md:col-span-5 md:row-start-1">
            <PlaygroundGuide guide={guide} onInsert={setInput} part="top" />
          </div>

          <section className="order-2 col-span-12 min-w-0 space-y-4 md:col-span-7 md:row-span-2 md:row-start-1">
            <ImageDropzone
              value={image}
              onChange={(next) => setImage(next)}
              disabled={status === "streaming"}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-400">
                  or try
                </span>
                {SAMPLES.map((sample) => (
                  <button
                    key={sample.label}
                    type="button"
                    onClick={() => void pickSample(sample)}
                    disabled={status === "streaming"}
                    className="group flex items-center gap-2 rounded border border-neutral-200 bg-white py-1 pl-1 pr-2.5 transition hover:border-[var(--accent)] disabled:opacity-50"
                  >
                    <Image
                      src={sample.image}
                      alt=""
                      width={28}
                      height={28}
                      className="h-7 w-7 rounded-sm object-cover"
                    />
                    <span className="font-mono text-[11px] text-neutral-600 group-hover:text-[color:var(--accent)]">
                      {sample.label}
                    </span>
                  </button>
                ))}
              </div>
            </ImageDropzone>

            {reading ? (
              <p className="flex items-center gap-2 font-mono text-xs text-[color:var(--accent)] motion-safe:animate-pulse">
                <span aria-hidden>◍</span> reading the image…
              </p>
            ) : null}

            {!image ? (
              <p className="font-mono text-xs text-neutral-400">
                Pick a picture before you ask — this one can only talk about what
                it can see.
              </p>
            ) : null}

            <ChatSurface
              title={tile.title}
              messages={messages}
              input={input}
              streaming={status === "streaming"}
              onInputChange={setInput}
              onSubmit={runStream}
              accentVars={accentVars}
            />
          </section>

          <div className="order-3 col-span-12 md:col-span-5 md:row-start-2">
            <PlaygroundGuide guide={guide} onInsert={setInput} part="bottom" />
          </div>
        </div>

        <SiteFooter />
      </div>
    </main>
  );
}
