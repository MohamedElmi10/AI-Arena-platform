import { getStore } from "@netlify/blobs";

// Shared cost-safety middleware. Every route that calls Azure MUST be wrapped in
// `withCostSafety(...)` (see docs/adr/0001-cost-safety-posture.md). Three layers:
//   1. max_tokens cap    — bounds per-request cost.
//   2. daily budget cap  — bounds total daily cost (counter in Netlify Blobs).
//   3. kill switch       — one env var stops everything.
// (The ADR's original IP rate limit was dropped — see the ADR for why.)

/** Hard cap on output tokens per model call. Bounds per-request cost. */
export const MAX_OUTPUT_TOKENS = 1000;

/** Hard cap on model calls per UTC day across all visitors. */
export const DAILY_MESSAGE_CAP = 500;

/** Netlify Blobs store name for the daily counter. */
const STORE_NAME = "cost-safety";

export type CostSafetyContext = {
  /** The token cap the handler must apply to its Azure request. */
  maxOutputTokens: number;
  /** Clamp a request payload's max_output_tokens to the cap. */
  clampMaxTokens: typeof clampMaxTokens;
};

export type CostSafetyHandler = (
  req: Request,
  ctx: CostSafetyContext
) => Promise<Response> | Response;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** UTC date key, e.g. "budget:2026-08-05". Keying by date auto-resets the
 *  counter at midnight UTC — a new day is simply a new key. */
export function dailyKey(now: Date = new Date()): string {
  return `budget:${now.toISOString().slice(0, 10)}`;
}

/** Midnight-UTC of the following day, as ISO — sent to the client as retryAfter. */
export function nextResetIso(now: Date = new Date()): string {
  const t = new Date(now);
  t.setUTCHours(24, 0, 0, 0);
  return t.toISOString();
}

/** Clamp a request payload's max_output_tokens down to the cap (default it if
 *  absent). Pure + exported so it's unit-testable on its own. */
export function clampMaxTokens<T extends { max_output_tokens?: number }>(
  payload: T
): T {
  const requested = payload.max_output_tokens ?? MAX_OUTPUT_TOKENS;
  return { ...payload, max_output_tokens: Math.min(requested, MAX_OUTPUT_TOKENS) };
}

/** Read today's count. Returns null if the store is unreachable (fail-open —
 *  the kill switch + token cap still bound cost; see ADR). */
async function readDailyCount(): Promise<number | null> {
  try {
    const store = getStore(STORE_NAME);
    const raw = await store.get(dailyKey());
    return raw ? Number(raw) : 0;
  } catch (err) {
    console.warn("[cost-safety] budget store unavailable, failing open:", err);
    return null;
  }
}

/** Increment today's count by one. Best-effort; ignores store errors. */
async function incrementDailyCount(current: number): Promise<void> {
  try {
    const store = getStore(STORE_NAME);
    await store.set(dailyKey(), String(current + 1));
  } catch (err) {
    console.warn("[cost-safety] could not persist budget count:", err);
  }
}

/**
 * Wrap a route handler with the cost-safety gates. Runs the kill switch and
 * daily-budget checks before the handler; on pass, reserves one message and
 * hands the handler the token cap to apply to its Azure call.
 */
export function withCostSafety(handler: CostSafetyHandler) {
  return async function (req: Request): Promise<Response> {
    // 1. Kill switch — hard stop, no downstream work.
    if (process.env.KILL_SWITCH === "true") {
      return json(
        {
          error: "paused",
          message: "This demo is temporarily paused. Please check back soon.",
        },
        503
      );
    }

    // 2. Daily global budget.
    const count = await readDailyCount();
    if (count !== null && count >= DAILY_MESSAGE_CAP) {
      return json(
        {
          error: "budget_capped",
          message:
            "This demo has hit its daily limit. Come back tomorrow and it'll be open again.",
          retryAfter: nextResetIso(),
        },
        429
      );
    }

    // Reserve this message against the cap (skipped if the store was down).
    if (count !== null) await incrementDailyCount(count);

    // 3. Hand off, with the token cap for the handler to apply.
    const ctx: CostSafetyContext = {
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      clampMaxTokens,
    };
    try {
      return await handler(req, ctx);
    } catch (err) {
      console.error("[cost-safety] handler error:", err);
      return json(
        {
          error: "server_error",
          message:
            "Something went wrong reaching the model. Please try again in a moment.",
        },
        500
      );
    }
  };
}
