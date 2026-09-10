"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Drop a file, pick one, or paste one — and hand back a data URL the API can
// take. Generalised from the old ImageDropzone so the extraction tiles can also
// accept a PDF: T-022 (Content Understanding) and T-023 (Document Intelligence)
// both need this, and Vision Chat still uses it in its image-only mode.
//
// The image downscale is NOT a cost control. Measured on this project: the same
// picture at 4096px and at 1536px both cost 753 input tokens, because Azure
// normalises the image before it charges. What the resize buys is a much smaller
// upload and about a second less waiting — worth keeping. PDFs are passed
// through untouched (there's nothing to resize, and a document analyzer reads
// the file, not a thumbnail).

const MAX_EDGE = 1536;
const MAX_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const DOC_TYPES = [...IMAGE_TYPES, "application/pdf"];

/** "image" -> images only (resized). "document" -> images + PDF (PDF passthrough). */
export type DropzoneKind = "image" | "document";

export type FileDropzoneProps = {
  /** Current file as a data URL, or null for empty. */
  value: string | null;
  onChange: (dataUrl: string | null, label?: string) => void;
  disabled?: boolean;
  /** What to accept. Defaults to image-only, the Vision Chat behaviour. */
  kind?: DropzoneKind;
  /** Rendered under the preview — the sample gallery lives here. */
  children?: React.ReactNode;
};

/**
 * Shrink an image so its longest edge is at most MAX_EDGE, and return a data URL.
 * Ships entirely in the browser — no library, no server round trip. PNGs stay
 * PNGs so text and charts keep their hard edges; anything else comes out as JPEG.
 */
async function imageToDataUrl(blob: Blob): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return blob.type === "image/png"
    ? canvas.toDataURL("image/png")
    : canvas.toDataURL("image/jpeg", 0.85);
}

/** Read a file (e.g. a PDF) straight to a base64 data URL, no transform. */
function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

export function FileDropzone({
  value,
  onChange,
  disabled,
  kind = "image",
  children,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);

  const accepted = kind === "document" ? DOC_TYPES : IMAGE_TYPES;
  const isPdf = value?.startsWith("data:application/pdf");

  async function accept(file: File) {
    setError(null);

    // The type check is on what the browser reports, sniffed from the bytes
    // rather than the filename — this project already shipped one sample that
    // was a PNG named .jpeg.
    if (!accepted.includes(file.type)) {
      setError(
        kind === "document"
          ? "That file isn't one I can read. Try a JPEG, PNG or PDF."
          : "That file isn't an image I can read. Try a JPEG, PNG or WebP."
      );
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That file is too large. Try one under 8MB.");
      return;
    }

    try {
      const dataUrl =
        file.type === "application/pdf"
          ? await fileToDataUrl(file)
          : await imageToDataUrl(file);
      setLabel(file.name);
      onChange(dataUrl, file.name);
    } catch {
      setError("Couldn't read that file. Try another one.");
    }
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file && !disabled) void accept(file);
        }}
        className={cn(
          "relative overflow-hidden rounded-md border-2 border-dashed transition",
          over
            ? "border-[var(--accent)] bg-[var(--accent-tint)]"
            : "border-neutral-300 bg-neutral-50",
          disabled && "opacity-60"
        )}
      >
        {value ? (
          <>
            {isPdf ? (
              <div className="flex h-40 w-full flex-col items-center justify-center gap-1 bg-white text-neutral-600">
                <span aria-hidden className="text-3xl">📄</span>
                <span className="max-w-[80%] truncate font-mono text-xs">
                  {label ?? "document.pdf"}
                </span>
                <span className="text-[11px] text-neutral-400">PDF · ready to analyze</span>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value}
                alt={label ?? "The file being analyzed"}
                className="max-h-56 w-full bg-white object-contain"
              />
            )}
            <button
              type="button"
              onClick={() => {
                setLabel(null);
                onChange(null);
              }}
              disabled={disabled}
              className="absolute right-2 top-2 rounded-md bg-[var(--accent)] px-3 py-1 font-mono text-xs font-semibold text-white shadow-md ring-1 ring-black/10 transition hover:opacity-90 disabled:opacity-50"
            >
              change
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="flex h-40 w-full flex-col items-center justify-center gap-1 text-sm text-neutral-500 transition hover:text-[color:var(--accent)] disabled:opacity-50"
          >
            <span className="font-semibold">
              {kind === "document" ? "Drop a file here" : "Drop an image here"}
            </span>
            <span className="text-xs">
              {kind === "document" ? "image or PDF · or click to choose" : "or click to choose one"}
            </span>
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accepted.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void accept(file);
            // Reset so choosing the same file twice still fires onChange.
            e.target.value = "";
          }}
        />
      </div>

      {error ? <p className="font-mono text-xs text-red-600">{error}</p> : children}
    </div>
  );
}

/** Fetch a committed sample image and put it through the same resize path as an upload. */
export async function sampleToDataUrl(src: string): Promise<string> {
  const blob = await (await fetch(src)).blob();
  return imageToDataUrl(blob);
}
