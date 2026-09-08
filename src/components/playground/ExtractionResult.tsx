"use client";

import { cn } from "@/lib/utils";

// The structured-fields panel. Content Understanding (T-022) builds it;
// Document Intelligence (T-023) reuses it for its value side. It takes a plain
// tree — the API route and the canned JSON both normalise to the same shape —
// and renders it recursively:
//   scalar          -> a labelled row
//   object          -> a subheading + nested rows
//   array of objects -> a table (columns = union of keys)
//   array of scalars -> a labelled row, comma-joined
// Empty / null fields are hidden, so a sparse result reads as clean, not broken.

export type ExtractionValue =
  | string
  | number
  | boolean
  | null
  | ExtractionValue[]
  | { [key: string]: ExtractionValue };
export type ExtractionFields = { [key: string]: ExtractionValue };

type ExtractionResultProps = {
  fields: ExtractionFields | null;
  loading?: boolean;
  /** Shown before anything has been analyzed. */
  emptyHint?: string;
  /** Two-way hover linking (T-023): the raw key of the row to highlight. */
  activeField?: string | null;
  /** Fired on top-level row hover enter (key) / leave (null). Enables linking. */
  onFieldActivate?: (key: string | null) => void;
};

function isObject(v: ExtractionValue): v is { [key: string]: ExtractionValue } {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Empty means "don't render": null, "", empty array, empty object. */
function isEmpty(v: ExtractionValue): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0 || v.every(isEmpty);
  if (isObject(v)) return Object.values(v).every(isEmpty);
  return false;
}

/** "VendorName" -> "Vendor Name"; "invoice_total" -> "Invoice Total". */
function humanize(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatScalar(v: string | number | boolean): string {
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

/** A table for an array of objects — the line-items case. */
function FieldTable({
  rows,
  parentName,
  activeField,
  onFieldActivate,
}: {
  rows: { [key: string]: ExtractionValue }[];
  parentName?: string;
  activeField?: string | null;
  onFieldActivate?: (key: string | null) => void;
}) {
  const columns = Array.from(
    rows.reduce<Set<string>>((set, row) => {
      Object.keys(row).forEach((k) => {
        if (!isEmpty(row[k])) set.add(k);
      });
      return set;
    }, new Set())
  );
  if (columns.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left">
            {columns.map((c) => (
              <th
                key={c}
                className="whitespace-nowrap py-1.5 pr-4 font-mono text-[11px] font-medium uppercase tracking-wider text-neutral-400"
              >
                {humanize(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const key = parentName ? `${parentName}#${i}` : null;
            const interactive = Boolean(onFieldActivate && key);
            const active = key != null && activeField === key;
            return (
              <tr
                key={i}
                onMouseEnter={interactive ? () => onFieldActivate?.(key!) : undefined}
                onMouseLeave={interactive ? () => onFieldActivate?.(null) : undefined}
                className={cn(
                  "border-b border-neutral-100 last:border-0",
                  interactive && "cursor-pointer transition-colors",
                  active && "bg-[var(--accent-tint)]"
                )}
              >
                {columns.map((c) => {
                  const cell = row[c];
                  return (
                    <td key={c} className="py-1.5 pr-4 align-top text-neutral-800">
                      {cell === undefined || isEmpty(cell)
                        ? "—"
                        : isObject(cell) || Array.isArray(cell)
                          ? JSON.stringify(cell)
                          : formatScalar(cell as string | number | boolean)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** One field — dispatches on its shape. `depth` just controls indent. */
function Field({
  name,
  value,
  depth,
  index,
  activeField,
  onFieldActivate,
}: {
  name: string;
  value: ExtractionValue;
  depth: number;
  index: number;
  activeField?: string | null;
  onFieldActivate?: (key: string | null) => void;
}) {
  // Staggered fade-in; motion-safe so prefers-reduced-motion gets no animation.
  const enter =
    "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300";
  const style = { animationDelay: `${index * 60}ms` } as const;

  const label = (
    <div className="font-mono text-[11px] uppercase tracking-wider text-neutral-400">
      {humanize(name)}
    </div>
  );

  // Array of objects -> table. Array of scalars -> joined row.
  if (Array.isArray(value)) {
    const objects = value.filter(isObject);
    if (objects.length > 0) {
      return (
        <div className={cn("space-y-1.5", enter)} style={style}>
          {label}
          <FieldTable
            rows={objects}
            parentName={name}
            activeField={activeField}
            onFieldActivate={onFieldActivate}
          />
        </div>
      );
    }
    const scalars = value.filter(
      (v): v is string | number | boolean => !isEmpty(v) && !isObject(v)
    );
    return (
      <div className={cn("space-y-0.5", enter)} style={style}>
        {label}
        <div className="text-neutral-800">{scalars.map(formatScalar).join(", ")}</div>
      </div>
    );
  }

  // Nested object -> subheading + recurse.
  if (isObject(value)) {
    const entries = Object.entries(value).filter(([, v]) => !isEmpty(v));
    return (
      <div className={cn("space-y-2", enter)} style={style}>
        {label}
        <div className="space-y-2 border-l-2 border-[var(--accent-tint)] pl-3">
          {entries.map(([k, v], i) => (
            <Field key={k} name={k} value={v} depth={depth + 1} index={i} />
          ))}
        </div>
      </div>
    );
  }

  // Scalar -> label + value row.
  if (value === null) return null;
  return (
    <div className={cn("space-y-0.5", enter)} style={style}>
      {label}
      <div className="text-neutral-900">{formatScalar(value)}</div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-4" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-2 w-20 rounded bg-neutral-200 motion-safe:animate-pulse" />
          <div
            className="h-3.5 rounded bg-neutral-100 motion-safe:animate-pulse"
            style={{ width: `${70 - i * 12}%` }}
          />
        </div>
      ))}
    </div>
  );
}

export function ExtractionResult({
  fields,
  loading,
  emptyHint,
  activeField,
  onFieldActivate,
}: ExtractionResultProps) {
  const entries = fields
    ? Object.entries(fields).filter(([, v]) => !isEmpty(v))
    : [];

  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4">
      {loading ? (
        <SkeletonRows />
      ) : entries.length > 0 ? (
        <div className="space-y-4">
          {entries.map(([k, v], i) => {
            const interactive = Boolean(onFieldActivate);
            const active = activeField != null && activeField === k;
            // Item arrays hover-link per row inside the table (keys "<field>#<i>"),
            // so they skip the whole-row wrapper to avoid a conflicting "<field>" key.
            const isItemArray = Array.isArray(v) && v.some(isObject);
            if (interactive && isItemArray) {
              return (
                <Field
                  key={k}
                  name={k}
                  value={v}
                  depth={0}
                  index={i}
                  activeField={activeField}
                  onFieldActivate={onFieldActivate}
                />
              );
            }
            return (
              <div
                key={k}
                onMouseEnter={interactive ? () => onFieldActivate?.(k) : undefined}
                onMouseLeave={interactive ? () => onFieldActivate?.(null) : undefined}
                className={cn(
                  interactive && "-mx-2 rounded px-2 py-1 transition-colors",
                  active && "bg-[var(--accent-tint)]"
                )}
              >
                <Field name={k} value={v} depth={0} index={i} />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="font-mono text-xs text-neutral-400">
          {emptyHint ?? "No fields yet — pick a preset and analyze something."}
        </p>
      )}
    </div>
  );
}
