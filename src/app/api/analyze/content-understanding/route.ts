import { withCostSafety, type CostSafetyHandler } from "@/lib/cost-safety";
import { getAgentCredential } from "@/lib/agent-credential";

// POST /api/analyze/content-understanding — runtime path for the Content
// Understanding tile (T-022).
//
// The TypeScript twin of src/app/vision/content-understanding/build.py: it posts
// the uploaded file to the same custom analyzer's :analyzeBinary operation,
// polls until it's done, and returns the extracted fields — server-side, so the
// Azure credential never reaches the browser, and wrapped in withCostSafety per
// ADR-0001. Only the two LIVE presets run here; audio + video are canned JSON
// served from the client (they bill per minute — see the tile README).
//
// Auth: keyless by default (the service-principal credential the agent tiles
// use, scope https://cognitiveservices.azure.com/.default). CU_KEY overrides it
// for local runs. Either way the secret stays on the server.
export const runtime = "nodejs";

const API_VERSION = "2025-11-01";
const CU_SCOPE = "https://cognitiveservices.azure.com/.default";

// preset -> analyzer id built by build.py (the repo's source of truth).
const LIVE_ANALYZERS: Record<string, string> = {
  business_card: "business_card",
  invoice: "invoice",
};

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];
const MAX_BYTES = 8 * 1024 * 1024;
const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 60_000;

const jsonError = (error: string, message: string, status: number): Response =>
  new Response(JSON.stringify({ error, message }), {
    status,
    headers: { "content-type": "application/json" },
  });

/** A single Content Understanding field, as the REST API returns it. */
type CuField = {
  valueString?: string;
  valueNumber?: number;
  valueInteger?: number;
  valueBoolean?: boolean;
  valueDate?: string;
  valueTime?: string;
  valueObject?: Record<string, CuField>;
  valueArray?: CuField[];
  valueJson?: unknown;
};

/** Collapse a typed CuField to a plain value — the same shape build.py's canned
 *  JSON uses, so ExtractionResult consumes one shape whatever the source. */
function plain(f: CuField | null | undefined): unknown {
  if (!f || typeof f !== "object") return null;
  if (f.valueString !== undefined) return f.valueString;
  if (f.valueNumber !== undefined) return f.valueNumber;
  if (f.valueInteger !== undefined) return f.valueInteger;
  if (f.valueBoolean !== undefined) return f.valueBoolean;
  if (f.valueDate !== undefined) return f.valueDate;
  if (f.valueTime !== undefined) return f.valueTime;
  if (f.valueObject)
    return Object.fromEntries(
      Object.entries(f.valueObject).map(([k, v]) => [k, plain(v)])
    );
  if (f.valueArray) return f.valueArray.map(plain);
  if (f.valueJson !== undefined) return f.valueJson;
  return null;
}

function parseDataUrl(
  dataUrl: string
): { type: string; bytes: Buffer } | null {
  const match = /^data:([^;,]+);base64,([\s\S]*)$/.exec(dataUrl);
  if (!match) return null;
  return { type: match[1].toLowerCase(), bytes: Buffer.from(match[2], "base64") };
}

/** Auth header — CU_KEY if set (local), else a bearer token from the SP. */
async function authHeader(): Promise<Record<string, string>> {
  const key = process.env.CU_KEY;
  if (key) return { "Ocp-Apim-Subscription-Key": key };
  const token = await getAgentCredential().getToken(CU_SCOPE);
  if (!token) throw new Error("Could not acquire a Content Understanding token.");
  return { Authorization: `Bearer ${token.token}` };
}

const handler: CostSafetyHandler = async (req) => {
  const body = (await req.json().catch(() => ({}))) as {
    preset?: string;
    file?: string;
  };

  const analyzerId = body.preset && LIVE_ANALYZERS[body.preset];
  if (!analyzerId) {
    return jsonError(
      "bad_request",
      "Unknown preset. Live extraction is available for the business card and invoice.",
      400
    );
  }
  if (typeof body.file !== "string" || !body.file.startsWith("data:")) {
    return jsonError("bad_request", "Send a file as a data URL.", 400);
  }

  const parsed = parseDataUrl(body.file);
  if (!parsed || !ALLOWED_TYPES.includes(parsed.type)) {
    return jsonError(
      "bad_request",
      "That file type isn't supported. Try a JPEG, PNG or PDF.",
      400
    );
  }
  if (parsed.bytes.byteLength > MAX_BYTES) {
    return jsonError("file_too_large", "That file is too large. Try one under 8MB.", 413);
  }

  const base = process.env.CU_ENDPOINT;
  if (!base) {
    return jsonError(
      "server_error",
      "Content Understanding isn't configured. Please try again later.",
      500
    );
  }
  const endpoint = base.endsWith("/") ? base : `${base}/`;

  let auth: Record<string, string>;
  try {
    auth = await authHeader();
  } catch (err) {
    console.error("[content-understanding] auth failed:", err);
    return jsonError("server_error", "Couldn't reach the analyzer. Please try again.", 500);
  }

  // 1. Submit the file to the analyzer's binary operation (async LRO).
  let operationLocation: string | null;
  try {
    const submit = await fetch(
      `${endpoint}contentunderstanding/analyzers/${analyzerId}:analyzeBinary?api-version=${API_VERSION}`,
      {
        method: "POST",
        headers: { ...auth, "content-type": "application/octet-stream" },
        // Buffer -> Uint8Array so the fetch body is a plain BodyInit.
        body: new Uint8Array(parsed.bytes),
      }
    );
    if (submit.status !== 202) {
      const detail = await submit.text().catch(() => "");
      console.error("[content-understanding] submit failed:", submit.status, detail);
      return jsonError(
        "upstream_error",
        "The analyzer couldn't read that file. Please try another.",
        502
      );
    }
    operationLocation = submit.headers.get("operation-location");
  } catch (err) {
    console.error("[content-understanding] submit error:", err);
    return jsonError("upstream_error", "Couldn't reach the analyzer. Please try again.", 502);
  }

  if (!operationLocation) {
    return jsonError("upstream_error", "The analyzer didn't return a result location.", 502);
  }

  // 2. Poll until Succeeded / Failed / timeout.
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
      console.error("[content-understanding] poll error:", err);
      return jsonError("upstream_error", "Lost the analyzer while waiting. Please try again.", 502);
    }
    if (!poll.ok) {
      const detail = await poll.text().catch(() => "");
      console.error("[content-understanding] poll status:", poll.status, detail);
      return jsonError("upstream_error", "Something went wrong analyzing that file.", 502);
    }

    const data = (await poll.json().catch(() => ({}))) as {
      status?: string;
      result?: { contents?: { fields?: Record<string, CuField> }[] };
    };
    const status = (data.status ?? "").toLowerCase();

    if (status === "failed" || status === "canceled") {
      return jsonError("upstream_error", "The analyzer couldn't extract fields from that file.", 502);
    }
    if (status === "succeeded") {
      const raw = data.result?.contents?.[0]?.fields ?? {};
      const fields = Object.fromEntries(
        Object.entries(raw).map(([k, v]) => [k, plain(v)])
      );
      return new Response(JSON.stringify({ fields }), {
        headers: { "content-type": "application/json" },
      });
    }
    // NotStarted / Running -> keep polling.
  }
};

// Its own tight daily budget: Content Understanding has no free tier, so every
// live call costs. Keep it well below the shared chat allowance.
export const POST = withCostSafety(handler, { limit: 60, key: "content-understanding" });
