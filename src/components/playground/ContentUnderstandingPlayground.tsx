"use client";

import { useRef, useState, type CSSProperties } from "react";
import Image, { type StaticImageData } from "next/image";
import type { Module, Tile, TileGuide } from "@/data/modules";
import { PlaygroundHeader } from "@/components/playground/PlaygroundHeader";
import { PlaygroundGuide } from "@/components/playground/PlaygroundGuide";
import { FileDropzone, sampleToDataUrl } from "@/components/playground/FileDropzone";
import {
  ExtractionResult,
  type ExtractionFields,
} from "@/components/playground/ExtractionResult";
import type { StreamStatus } from "@/components/playground/LiveStats";
import { nowMs } from "@/lib/clock";
import { SiteFooter } from "@/components/SiteFooter";

import cardSample from "@/app/vision/content-understanding/samples/business-card.png";
import invoiceSample from "@/app/vision/content-understanding/samples/invoice.png";
import callRecording from "@/app/vision/content-understanding/canned/call_recording.json";
import productDemo from "@/app/vision/content-understanding/canned/product_demo.json";

// A bespoke playground, like VisionPlayground. The whole point of this tile is
// "one analyzer schema, any modality": a preset picks a field-set, and the same
// ExtractionResult panel renders all four — business card (image) and invoice
// (document) run live; call recording (audio) and product demo (video) are
// pre-analysed, because audio/video bill per minute (see the tile README).

type Preset = {
  id: string;
  label: string;
  modality: string;
  live: boolean;
  /** The keys this analyzer pulls out — shown as a hint under the picker. */
  fieldset: string[];
  /** Live presets: the committed sample to tap-load. */
  sample?: StaticImageData;
  /** Live presets: image-only or image+PDF in the dropzone. */
  accept?: "image" | "document";
  /** A/V presets: the captured result. */
  canned?: ExtractionFields;
  /** A/V presets: the source media to show above the result (served from public/). */
  audioSrc?: string;
  posterSrc?: string;
  videoSrc?: string;
};

const PRESETS: Preset[] = [
  {
    id: "business_card",
    label: "Business card",
    modality: "image",
    live: true,
    fieldset: ["Name", "Title", "Company", "Email", "Phone", "Address"],
    sample: cardSample,
    accept: "image",
  },
  {
    id: "invoice",
    label: "Invoice",
    modality: "document",
    live: true,
    fieldset: ["VendorName", "CustomerName", "InvoiceId", "InvoiceDate", "DueDate", "SubTotal", "Tax", "InvoiceTotal", "Items"],
    sample: invoiceSample,
    accept: "document",
  },
  {
    id: "call_recording",
    label: "Call recording",
    modality: "audio",
    live: false,
    fieldset: ["Summary", "Sentiment"],
    canned: callRecording as ExtractionFields,
    audioSrc: "/content-understanding/call-recording.mp3",
  },
  {
    id: "product_demo",
    label: "Product demo",
    modality: "video",
    live: false,
    fieldset: ["Summary", "Segments"],
    canned: productDemo as ExtractionFields,
    posterSrc: "/content-understanding/product-demo-poster.jpg",
    videoSrc: "/content-understanding/product-demo.mp4",
  },
];

type Props = {
  module: Module;
  tile: Tile;
  guide: TileGuide;
  chapter: number;
};

function fieldCount(fields: ExtractionFields | null): number {
  if (!fields) return 0;
  return Object.values(fields).filter((v) => {
    if (v === null || v === "") return false;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  }).length;
}

export function ContentUnderstandingPlayground({
  module,
  tile,
  guide,
  chapter,
}: Props) {
  const [presetId, setPresetId] = useState<string>(PRESETS[0].id);
  const [file, setFile] = useState<string | null>(null);
  const [fields, setFields] = useState<ExtractionFields | null>(null);
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [latency, setLatency] = useState("—");
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0];

  const accentVars = {
    "--accent": module.color.accent,
    "--accent-fg": module.color.fg,
    "--accent-pale": module.color.bg,
    "--accent-tint": module.color.tint,
  } as CSSProperties;

  function selectPreset(id: string) {
    const next = PRESETS.find((p) => p.id === id);
    if (!next) return;
    setPresetId(id);
    setFile(null);
    setError(null);
    setLatency("—");
    setStatus("idle");
    // Canned presets show their captured result immediately; live ones wait.
    setFields(next.live ? null : next.canned ?? null);
  }

  // A "Try this" prompt is a preset label — jump to that field-set + modality.
  const insertPreset = (v: string) => {
    const match = PRESETS.find(
      (p) => p.label.toLowerCase() === v.toLowerCase()
    );
    if (match) selectPreset(match.id);
  };

  async function loadSample() {
    if (!preset.sample) return;
    setFile(await sampleToDataUrl(preset.sample.src));
    setFields(null);
    setError(null);
  }

  async function analyze() {
    if (!preset.live || !file || busy.current) return;
    busy.current = true;
    setStatus("streaming");
    setError(null);
    setFields(null);
    const start = nowMs();

    try {
      const res = await fetch("/api/analyze/content-understanding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ preset: preset.id, file }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          (data?.message as string | undefined) ??
            "Something went wrong analyzing that file. Please try again."
        );
        return;
      }
      setLatency(`${Math.round(nowMs() - start)}ms`);
      setFields((data.fields ?? {}) as ExtractionFields);
    } catch (err) {
      console.error("[content-understanding] analyze failed:", err);
      setError("Something went wrong reaching the analyzer. Please try again.");
    } finally {
      setStatus("idle");
      busy.current = false;
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
            model={tile.model ?? "gpt-4.1"}
            tokens={fieldCount(fields)}
            tokensLabel="Fields"
            latency={latency}
            status={status}
          />
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:items-start">
          {/* Left column = guide. On mobile the wrapper is `contents`, so its two
              parts become siblings of <section> and the interactive panel wedges
              between them (order-1 / 2 / 3). On desktop it's a real block column
              that sizes to its own content, so a tall result can't stretch it into
              a gap between "Try this" and "What to expect". */}
          <div className="contents md:col-span-5 md:block md:space-y-6">
            <div className="order-1">
              <PlaygroundGuide guide={guide} onInsert={insertPreset} part="top" />
            </div>
            <div className="order-3">
              <PlaygroundGuide guide={guide} onInsert={insertPreset} part="bottom" />
            </div>
          </div>

          <section className="order-2 min-w-0 space-y-4 md:col-span-7">
            {/* Preset picker — the field-set + modality selector. */}
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => {
                const active = p.id === presetId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectPreset(p.id)}
                    className={
                      "rounded-md border px-3 py-1.5 text-left transition " +
                      (active
                        ? "border-[var(--accent)] bg-[var(--accent-tint)]"
                        : "border-neutral-200 bg-white hover:border-[var(--accent)]")
                    }
                  >
                    <span className="block text-sm font-semibold text-neutral-800">
                      {p.label}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                      {p.modality}
                      {p.live ? "" : " · saved"}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="font-mono text-[11px] text-neutral-500">
              extracts:{" "}
              <span className="text-neutral-700">{preset.fieldset.join(" · ")}</span>
            </p>

            {preset.live ? (
              <>
                <FileDropzone
                  value={file}
                  onChange={(next) => {
                    setFile(next);
                    if (!next) setFields(null);
                  }}
                  kind={preset.accept ?? "image"}
                  disabled={status === "streaming"}
                >
                  {preset.sample ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-400">
                        or try
                      </span>
                      <button
                        type="button"
                        onClick={() => void loadSample()}
                        disabled={status === "streaming"}
                        className="group flex items-center gap-2 rounded border border-neutral-200 bg-white py-1 pl-1 pr-2.5 transition hover:border-[var(--accent)] disabled:opacity-50"
                      >
                        <Image
                          src={preset.sample}
                          alt=""
                          width={28}
                          height={28}
                          className="h-7 w-7 rounded-sm object-cover"
                        />
                        <span className="font-mono text-[11px] text-neutral-600 group-hover:text-[color:var(--accent)]">
                          {preset.label.toLowerCase()} sample
                        </span>
                      </button>
                    </div>
                  ) : null}
                </FileDropzone>

                <button
                  type="button"
                  onClick={() => void analyze()}
                  disabled={!file || status === "streaming"}
                  className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === "streaming" ? "Analyzing…" : "Extract fields"}
                </button>
              </>
            ) : (
              <div className="space-y-3">
                {preset.audioSrc ? (
                  <audio controls src={preset.audioSrc} className="w-full" />
                ) : null}
                {preset.videoSrc ? (
                  <video
                    controls
                    preload="none"
                    poster={preset.posterSrc}
                    src={preset.videoSrc}
                    className="w-full rounded-md border border-neutral-200 bg-black"
                  />
                ) : null}
                <p className="rounded-md border border-neutral-200 bg-neutral-50 p-3 font-mono text-xs text-neutral-500">
                  Saved result. Audio and video bill per minute, so this one was
                  run once and is replayed here — same analyzer, different modality.
                </p>
              </div>
            )}

            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 p-3 font-mono text-xs text-red-600">
                {error}
              </p>
            ) : null}

            <ExtractionResult
              fields={fields}
              loading={status === "streaming"}
              emptyHint={
                preset.live
                  ? "Pick the sample or drop your own, then hit Extract fields."
                  : undefined
              }
            />
          </section>
        </div>

        <SiteFooter />
      </div>
    </main>
  );
}
