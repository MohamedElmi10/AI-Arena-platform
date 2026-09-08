"use client";


// The Document Intelligence showpiece (T-023): the document image with a box
// drawn over every extracted field, hover-linked both ways to the field list.
//
// Boxes come back in the analyzed image's own pixel units (pages[0].width/height,
// unit "pixel" for images). Rather than measure the rendered <img> and scale by
// hand, the overlay is an SVG whose viewBox IS the page in those units and which
// is stretched to exactly cover the image (same box, same aspect) — so the
// polygon points map 1:1 and it all stays correct at any responsive width.
// vectorEffect keeps the stroke crisp despite the large viewBox scale.

export type OverlayBox = { field: string; polygon: number[] };

type AnnotationOverlayProps = {
  src: string;
  page: { width: number; height: number; unit: string };
  boxes: OverlayBox[];
  activeField: string | null;
  onFieldActivate: (field: string | null) => void;
  /** True while the analyzer is running — shows a shimmer over the page. */
  loading?: boolean;
};

/** [x1,y1,...] -> "x1,y1 x2,y2 ..." for an SVG <polygon>. */
function toPoints(poly: number[]): string {
  const pairs: string[] = [];
  for (let i = 0; i + 1 < poly.length; i += 2) pairs.push(`${poly[i]},${poly[i + 1]}`);
  return pairs.join(" ");
}

export function AnnotationOverlay({
  src,
  page,
  boxes,
  activeField,
  onFieldActivate,
  loading,
}: AnnotationOverlayProps) {
  const hasViewBox = page.width > 0 && page.height > 0;

  return (
    <div className="relative overflow-hidden rounded-md border border-neutral-200 bg-neutral-50">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="The document being analyzed" className="block w-full" />

      {hasViewBox && boxes.length > 0 ? (
        <svg
          viewBox={`0 0 ${page.width} ${page.height}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          {boxes.map((b, i) => {
            const active = b.field === activeField;
            return (
              <polygon
                key={b.field}
                points={toPoints(b.polygon)}
                className="pointer-events-auto cursor-pointer motion-safe:animate-in motion-safe:fade-in"
                style={{ animationDelay: `${i * 40}ms` }}
                fill="var(--accent)"
                fillOpacity={active ? 0.22 : 0.04}
                stroke="var(--accent)"
                strokeOpacity={active ? 1 : 0.45}
                strokeWidth={active ? 3 : 1.5}
                vectorEffect="non-scaling-stroke"
                onMouseEnter={() => onFieldActivate(b.field)}
                onMouseLeave={() => onFieldActivate(null)}
              />
            );
          })}
        </svg>
      ) : null}

      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 motion-safe:animate-pulse">
          <span className="rounded bg-white/80 px-3 py-1 font-mono text-xs text-[color:var(--accent)] shadow-sm">
            analysing…
          </span>
        </div>
      ) : null}
    </div>
  );
}
