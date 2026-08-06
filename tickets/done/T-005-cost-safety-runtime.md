# T-005: Cost safety runtime (middleware)

**Status:** open
**Blocked by:** T-001
**Blocks:** T-007

## Goal
Build the shared cost-safety middleware every Azure-calling route will use. Blocks T-007 because T-007 must NOT ship without it.

> **Scope change (agreed with Mohamed):** three protections, not four. The IP
> rate limit was dropped, and the store for the daily counter is **Netlify Blobs**
> (built into the deploy host) instead of Upstash Redis. Rationale recorded in
> [ADR-0001 → Update](../../docs/adr/0001-cost-safety-posture.md).

## Acceptance
- [x] `src/lib/cost-safety.ts` exports `withCostSafety(handler)`.
- [x] Enforces `max_tokens: 400` cap — exposed as `MAX_OUTPUT_TOKENS` + a `clampMaxTokens()` helper the handler applies to its Azure request.
- [x] Daily global budget: **500 messages / day**. Counter in **Netlify Blobs**, keyed by UTC date (auto-resets at midnight UTC). Over cap → `{ error: 'budget_capped', message, retryAfter: '<tomorrow-UTC>' }`, 429, no downstream call.
- [x] Kill switch: if `process.env.KILL_SWITCH === 'true'`, response `{ error: 'paused', message }` with 503 status. No Azure call.
- [x] Errors return graceful JSON with `error` and human-readable `message` fields; the client renders them as an assistant bubble.
- [x] `.env.local.example` at repo root documents required env vars: `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `MODEL_ENDPOINT`, `KILL_SWITCH`. (Netlify Blobs needs no vars — auto-provisioned on Netlify.)
- [x] Vitest unit tests for each protection (Netlify Blobs mocked): 7 tests, all passing.

## Notes
- Reference: [ADR-0001](../../docs/adr/0001-cost-safety-posture.md) (see the T-005 Update section).
- The daily-budget store **fails open** if unreachable — the token cap + kill switch still bound cost, so a store hiccup can't take the demo offline.
- Middleware signature: `withCostSafety((req, ctx) => Response)` — `ctx` carries `maxOutputTokens` + `clampMaxTokens` for the handler to apply to its Azure call. T-007 wires the real Azure call inside the handler.
- Do NOT ship code that calls Azure without this middleware. T-007 depends on it.
