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
import {
  AnnotationOverlay,
  type OverlayBox,
} from "@/components/playground/AnnotationOverlay";
import type { StreamStatus } from "@/components/playground/LiveStats";
import { SiteFooter } from "@/components/SiteFooter";
import { nowMs } from "@/lib/clock";

import receiptSample from "@/app/vision/document-intelligence/samples/receipt.png";
import invoiceSample from "@/app/vision/document-intelligence/samples/invoice.png";
import idSample from "@/app/vision/document-intelligence/samples/id.png";

// A bespoke playground, like ContentUnderstandingPlayground. This tile's
// showpiece is spatial: extract a document's fields AND box each one on the
// page, with the field list and the boxes hover-linked both ways. Reuses
// FileDropzone (T-020) and ExtractionResult (T-022); the new part is
// AnnotationOverlay.

type DocType = {
  id: string;
  label: string;
  hint: string;
  sample: StaticImageData;
};

const DOC_TYPES: DocType[] = [
  { id: "receipt", label: "Receipt", hint: "merchant · total · tax · items · date", sample: receiptSample },
  { id: "invoice", label: "Invoice", hint: "vendor · customer · total · due date · line items", sample: invoiceSample },
  { id: "id", label: "ID card", hint: "name · date of birth · document number · expiry", sample: idSample },
];

type AnalyzeResult = {
  page: { width: number; height: number; unit: string };
  fields: ExtractionFields;
  boxes: OverlayBox[];
};

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

export function DocumentIntelligencePlayground({ module, tile, guide, chapter }: Props) {
  const [docTypeId, setDocTypeId] = useState<string>(DOC_TYPES[0].id);
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [latency, setLatency] = useState("—");
  const [error, setError] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<string | null>(null);
  const busy = useRef(false);

  const docType = DOC_TYPES.find((d) => d.id === docTypeId) ?? DOC_TYPES[0];

  const accentVars = {
    "--accent": module.color.accent,
    "--accent-fg": module.color.fg,
    "--accent-pale": module.color.bg,
    "--accent-tint": module.color.tint,
  } as CSSProperties;

  function selectDocType(id: string) {
    if (!DOC_TYPES.some((d) => d.id === id)) return;
    setDocTypeId(id);
    setImage(null);
    setResult(null);
    setError(null);
    setLatency("—");
    setActiveField(null);
  }

  // A "Try this" prompt is a doc-type label — jump to that model + sample.
  const insertDocType = (v: string) => {
    const m = DOC_TYPES.find((d) => d.label.toLowerCase() === v.toLowerCase());
    if (m) selectDocType(m.id);
  };

  async function loadSample() {
    setImage(await sampleToDataUrl(docType.sample.src));
    setResult(null);
    setError(null);
  }

  async function analyze() {
    if (!image || busy.current) return;
    busy.current = true;
    setStatus("streaming");
    setError(null);
    setResult(null);
    setActiveField(null);
    const start = nowMs();

    try {
      const res = await fetch("/api/analyze/document-intelligence", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ docType: docType.id, image }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          (data?.message as string | undefined) ??
            "Something went wrong analyzing that document. Please try again."
        );
        return;
      }
      setLatency(`${Math.round(nowMs() - start)}ms`);
      setResult(data as AnalyzeResult);
    } catch (err) {
      console.error("[document-intelligence] analyze failed:", err);
      setError("Something went wrong reaching the model. Please try again.");
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
            model={tile.model ?? "prebuilt models"}
            tokens={fieldCount(result?.fields ?? null)}
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
          <div className="contents md:col-span-4 md:block md:space-y-6">
            <div className="order-1">
              <PlaygroundGuide guide={guide} onInsert={insertDocType} part="top" />
            </div>
            <div className="order-3">
              <PlaygroundGuide guide={guide} onInsert={insertDocType} part="bottom" />
            </div>
          </div>

          <section className="order-2 min-w-0 space-y-4 md:col-span-8">
            {/* Doc-type picker */}
            <div className="flex flex-wrap gap-2">
              {DOC_TYPES.map((d) => {
                const active = d.id === docTypeId;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => selectDocType(d.id)}
                    className={
                      "rounded-md border px-3 py-1.5 text-sm font-semibold transition " +
                      (active
                        ? "border-[var(--accent)] bg-[var(--accent-tint)] text-neutral-900"
                        : "border-neutral-200 bg-white text-neutral-700 hover:border-[var(--accent)]")
                    }
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
            <p className="font-mono text-[11px] text-neutral-500">
              extracts: <span className="text-neutral-700">{docType.hint}</span>
            </p>

            <FileDropzone
              value={image}
              onChange={(next) => {
                setImage(next);
                if (!next) setResult(null);
              }}
              kind="image"
              disabled={status === "streaming"}
            >
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
                  <Image src={docType.sample} alt="" width={28} height={28} className="h-7 w-7 rounded-sm object-cover" />
                  <span className="font-mono text-[11px] text-neutral-600 group-hover:text-[color:var(--accent)]">
                    {docType.label.toLowerCase()} sample
                  </span>
                </button>
              </div>
            </FileDropzone>

            <button
              type="button"
              onClick={() => void analyze()}
              disabled={!image || status === "streaming"}
              className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "streaming" ? "Analyzing…" : "Extract & box"}
            </button>

            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 p-3 font-mono text-xs text-red-600">
                {error}
              </p>
            ) : null}

            {/* Result: the page with boxes, and the hover-linked field list. */}
            {image && (result || status === "streaming") ? (
              <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                <AnnotationOverlay
                  src={image}
                  page={result?.page ?? { width: 0, height: 0, unit: "pixel" }}
                  boxes={result?.boxes ?? []}
                  activeField={activeField}
                  onFieldActivate={setActiveField}
                  loading={status === "streaming"}
                />
                <ExtractionResult
                  fields={result?.fields ?? null}
                  loading={status === "streaming"}
                  activeField={activeField}
                  onFieldActivate={setActiveField}
                  emptyHint="Hover a field to highlight its box on the page."
                />
              </div>
            ) : (
              <p className="font-mono text-xs text-neutral-400">
                Pick the sample or drop a document image, then Extract &amp; box.
              </p>
            )}
          </section>
        </div>

        <SiteFooter />
      </div>
    </main>
  );
}
