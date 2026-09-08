import { withCostSafety, type CostSafetyHandler } from "@/lib/cost-safety";

// POST /api/analyze/document-intelligence — runtime path for the Document
// Intelligence tile (T-023).
//
// The TypeScript twin of src/app/vision/document-intelligence/build.py: it posts
// the uploaded image to a prebuilt model's :analyze op, polls, and returns each
// field's value AND its bounding polygon — server-side, so the key never reaches
// the browser, and wrapped in withCostSafety per ADR-0001. The polygons are the
// tile's showpiece: AnnotationOverlay draws them over the page.
export const runtime = "nodejs";

const API_VERSION = "2024-11-30";

// doc type -> prebuilt model id.
const MODELS: Record<string, string> = {
  receipt: "prebuilt-receipt",
  invoice: "prebuilt-invoice",
  id: "prebuilt-idDocument",
};

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/tiff"];
const MAX_BYTES = 8 * 1024 * 1024;
const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 45_000;

const jsonError = (error: string, message: string, status: number): Response =>
  new Response(JSON.stringify({ error, message }), {
    status,
    headers: { "content-type": "application/json" },
  });

/** A Document Intelligence field, as the REST API returns it (v4.0). */
type DiField = {
  type?: string;
  content?: string;
  confidence?: number;
  valueString?: string;
  valueNumber?: number;
  valueInteger?: number;
  valueDate?: string;
  valueTime?: string;
  valuePhoneNumber?: string;
  valueCountryRegion?: string;
  valueSelectionMark?: string;
  valueCurrency?: { amount?: number; currencyCode?: string; currencySymbol?: string };
  valueAddress?: Record<string, string>;
  valueArray?: DiField[];
  valueObject?: Record<string, DiField>;
  boundingRegions?: { pageNumber: number; polygon: number[] }[];
};

/** Collapse a field to a plain value — the shape ExtractionResult renders. */
function plain(f: DiField | null | undefined): unknown {
  if (!f || typeof f !== "object") return null;
  if (f.valueString !== undefined) return f.valueString;
  if (f.valueNumber !== undefined) return f.valueNumber;
  if (f.valueInteger !== undefined) return f.valueInteger;
  if (f.valueDate !== undefined) return f.valueDate;
  if (f.valueTime !== undefined) return f.valueTime;
  if (f.valuePhoneNumber !== undefined) return f.valuePhoneNumber;
  if (f.valueCountryRegion !== undefined) return f.valueCountryRegion;
  if (f.valueSelectionMark !== undefined) return f.valueSelectionMark;
  if (f.valueCurrency) {
    const c = f.valueCurrency;
    return `${c.currencySymbol ?? ""}${c.amount ?? ""} ${c.currencyCode ?? ""}`.trim();
  }
  if (f.valueAddress) {
    // Prefer the streetAddress line; fall back to the whole thing joined.
    return (
      f.valueAddress.streetAddress ??
      Object.values(f.valueAddress).filter(Boolean).join(", ")
    );
  }
  if (f.valueObject)
    return Object.fromEntries(
      Object.entries(f.valueObject).map(([k, v]) => [k, plain(v)])
    );
  if (f.valueArray) return f.valueArray.map(plain);
  return f.content ?? null;
}

function parseDataUrl(dataUrl: string): { type: string; bytes: Buffer } | null {
  const match = /^data:([^;,]+);base64,([\s\S]*)$/.exec(dataUrl);
  if (!match) return null;
  return { type: match[1].toLowerCase(), bytes: Buffer.from(match[2], "base64") };
}

const handler: CostSafetyHandler = async (req) => {
  const body = (await req.json().catch(() => ({}))) as {
    docType?: string;
    image?: string;
  };

  const modelId = body.docType && MODELS[body.docType];
  if (!modelId) {
    return jsonError(
      "bad_request",
      "Unknown document type. Choose receipt, invoice or ID.",
      400
    );
  }
  if (typeof body.image !== "string" || !body.image.startsWith("data:image/")) {
    return jsonError("bad_request", "Send an image as a data URL.", 400);
  }

  const parsed = parseDataUrl(body.image);
  if (!parsed || !ALLOWED_TYPES.includes(parsed.type)) {
    return jsonError(
      "bad_request",
      "That image format isn't supported. Try a JPEG, PNG or TIFF.",
      400
    );
  }
  if (parsed.bytes.byteLength > MAX_BYTES) {
    return jsonError("image_too_large", "That image is too large. Try one under 8MB.", 413);
  }

  const base = process.env.DOCINTEL_ENDPOINT;
  const key = process.env.DOCINTEL_KEY;
  if (!base || !key) {
    return jsonError(
      "server_error",
      "Document Intelligence isn't configured. Please try again later.",
      500
    );
  }
  const endpoint = base.endsWith("/") ? base : `${base}/`;
  const auth = { "Ocp-Apim-Subscription-Key": key };

  // 1. Submit the image (binary) to the prebuilt model's analyze op.
  let operationLocation: string | null;
  try {
    const submit = await fetch(
      `${endpoint}documentintelligence/documentModels/${modelId}:analyze?api-version=${API_VERSION}`,
      {
        method: "POST",
        headers: { ...auth, "content-type": "application/octet-stream" },
        body: new Uint8Array(parsed.bytes),
      }
    );
    if (submit.status !== 202) {
      const detail = await submit.text().catch(() => "");
      console.error("[document-intelligence] submit failed:", submit.status, detail);
      // F0's own rate limit surfaces as 429 — tell it apart from the cost cap.
      if (submit.status === 429) {
        return jsonError(
          "azure_rate_limit",
          "The free Azure tier is busy right now. Give it a few seconds and try again.",
          429
        );
      }
      return jsonError(
        "upstream_error",
        "The model couldn't read that image. Please try another.",
        502
      );
    }
    operationLocation = submit.headers.get("operation-location");
  } catch (err) {
    console.error("[document-intelligence] submit error:", err);
    return jsonError("upstream_error", "Couldn't reach the model. Please try again.", 502);
  }

  if (!operationLocation) {
    return jsonError("upstream_error", "The model didn't return a result location.", 502);
  }

  // 2. Poll until succeeded / failed / timeout.
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  for (;;) {
    if (Date.now() > deadline) {
      return jsonError("timeout", "That took too long to analyze. Please try again.", 504);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    let poll: Response;
    try {
      poll = await fetch(operationLocation, { headers: auth });
    } catch (err) {
      console.error("[document-intelligence] poll error:", err);
      return jsonError("upstream_error", "Lost the model while waiting. Please try again.", 502);
    }
    if (!poll.ok) {
      const detail = await poll.text().catch(() => "");
      console.error("[document-intelligence] poll status:", poll.status, detail);
      return jsonError("upstream_error", "Something went wrong analyzing that image.", 502);
    }

    const data = (await poll.json().catch(() => ({}))) as {
      status?: string;
      analyzeResult?: {
        documents?: { fields?: Record<string, DiField> }[];
        pages?: { width?: number; height?: number; unit?: string }[];
      };
    };
    const status = (data.status ?? "").toLowerCase();
    if (status === "failed") {
      return jsonError("upstream_error", "The model couldn't extract fields from that image.", 502);
    }
    if (status === "succeeded") {
      const doc = data.analyzeResult?.documents?.[0];
      const rawFields = doc?.fields ?? {};
      const page = data.analyzeResult?.pages?.[0] ?? {};

      // Plain values for the panel (ExtractionResult), boxes for the overlay.
      // One box per top-level field (its first bounding region); sub-field boxes
      // are a later refinement — the top-level links are the demo.
      const fields: Record<string, unknown> = {};
      const boxes: { field: string; polygon: number[] }[] = [];

      // Axis-aligned bounding rect (as an 8-number polygon) over several polygons.
      const unionRect = (polys: number[][]): number[] | null => {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const poly of polys)
          for (let i = 0; i + 1 < poly.length; i += 2) {
            minX = Math.min(minX, poly[i]); maxX = Math.max(maxX, poly[i]);
            minY = Math.min(minY, poly[i + 1]); maxY = Math.max(maxY, poly[i + 1]);
          }
        if (!Number.isFinite(minX)) return null;
        return [minX, minY, maxX, minY, maxX, maxY, minX, maxY];
      };

      for (const [name, field] of Object.entries(rawFields)) {
        fields[name] = plain(field);
        const poly = field.boundingRegions?.[0]?.polygon;
        if (poly && poly.length === 8) boxes.push({ field: name, polygon: poly });

        // Array fields (line items): one box per item — the union of that item's
        // sub-field regions — so each row on the page is boxed and hover-links to
        // its row in the panel (key "<Field>#<index>", matched in ExtractionResult).
        if (field.valueArray) {
          field.valueArray.forEach((item, i) => {
            const polys: number[][] = [];
            const own = item.boundingRegions?.[0]?.polygon;
            if (own && own.length === 8) polys.push(own);
            for (const sub of Object.values(item.valueObject ?? {})) {
              const sp = sub.boundingRegions?.[0]?.polygon;
              if (sp && sp.length === 8) polys.push(sp);
            }
            const u = unionRect(polys);
            if (u) boxes.push({ field: `${name}#${i}`, polygon: u });
          });
        }
      }

      return new Response(
        JSON.stringify({
          page: { width: page.width ?? 0, height: page.height ?? 0, unit: page.unit ?? "pixel" },
          fields,
          boxes,
        }),
        { headers: { "content-type": "application/json" } }
      );
    }
    // running / notStarted -> keep polling.
  }
};

// Its own daily budget. F0 is free (500 pages/mo) but capped; keep it modest.
export const POST = withCostSafety(handler, { limit: 100, key: "document-intelligence" });
