"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Drop an image, pick one, or paste one — and hand back a data URL the API can
// take. Built reusable: T-022 (Content Understanding) and T-023 (Document
// Intelligence) both need the same thing.
//
// The downscale is NOT a cost control. Measured on this project: the same
// picture at 4096px and at 1536px both cost 753 input tokens, because Azure
// normalises the image before it charges. What the resize buys is a much smaller
// upload and about a second less waiting — which is the whole of the case on a
// phone, and enough of one to keep.

const MAX_EDGE = 1536;
const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export type ImageDropzoneProps = {
  /** Current image as a data URL, or null for empty. */
  value: string | null;
  onChange: (dataUrl: string | null, label?: string) => void;
  disabled?: boolean;
  /** Rendered under the preview — the sample gallery lives here. */
  children?: React.ReactNode;
};

/**
 * Shrink an image so its longest edge is at most MAX_EDGE, and return a data URL.
 *
 * Everything here ships in the browser already — no library, no server round
 * trip. PNGs stay PNGs so text and charts keep their hard edges; anything else
 * comes out as JPEG, which is far smaller for photographs.
 */
async function toDataUrl(blob: Blob): Promise<string> {
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

export function ImageDropzone({
  value,
  onChange,
  disabled,
  children,
}: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);

  async function accept(file: File) {
    setError(null);

    // The type check is on what the browser reports, which is sniffed from the
    // bytes rather than read off the filename — this project already shipped one
    // sample that was a PNG named .jpeg.
    if (!ACCEPTED.includes(file.type)) {
      setError("That file isn't an image I can read. Try a JPEG, PNG or WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That image is too large. Try one under 8MB.");
      return;
    }

    try {
      const dataUrl = await toDataUrl(file);
      setLabel(file.name);
      onChange(dataUrl, file.name);
    } catch {
      setError("Couldn't read that image. Try another one.");
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt={label ?? "The image being discussed"}
              className="max-h-56 w-full bg-white object-contain"
            />
            <button
              type="button"
              onClick={() => {
                setLabel(null);
                onChange(null);
              }}
              disabled={disabled}
              className="absolute right-2 top-2 rounded bg-white/90 px-2 py-1 font-mono text-[11px] text-neutral-600 shadow-sm transition hover:bg-white disabled:opacity-50"
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
            <span className="font-semibold">Drop an image here</span>
            <span className="text-xs">or click to choose one</span>
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void accept(file);
            // Reset so choosing the same file twice still fires onChange.
            e.target.value = "";
          }}
        />
      </div>

      {error ? (
        <p className="font-mono text-xs text-red-600">{error}</p>
      ) : (
        children
      )}
    </div>
  );
}

/** Fetch a committed sample and put it through the same resize path as an upload. */
export async function sampleToDataUrl(src: string): Promise<string> {
  const blob = await (await fetch(src)).blob();
  return toDataUrl(blob);
}
