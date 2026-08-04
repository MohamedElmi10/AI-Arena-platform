# T-005: Cost safety runtime (middleware)

**Status:** open
**Blocked by:** T-001
**Blocks:** T-007

## Goal
Build the shared cost-safety middleware every Azure-calling route will use. Blocks T-007 because T-007 must NOT ship without it.

## Acceptance
- [ ] `src/lib/cost-safety.ts` exports `withCostSafety(handler)`.
- [ ] Enforces `max_tokens: 400` cap — injected into request body before forwarding.
- [ ] IP rate limit via Upstash Redis: **5 messages / min / IP**. Uses `@upstash/ratelimit` (sliding window).
- [ ] Daily global budget: **500 messages / day**. Uses a Redis counter with midnight-UTC reset. Over cap → response with `{ error: 'budget_capped', retryAfter: '<tomorrow>' }` and no downstream call.
- [ ] Kill switch: if `process.env.KILL_SWITCH === 'true'`, response `{ error: 'paused' }` with 503 status. No Azure call.
- [ ] Errors return graceful JSON with `error` and human-readable `message` fields; the client renders them as an assistant bubble.
- [ ] `.env.local.example` at repo root documents required env vars: `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `KILL_SWITCH`.
- [ ] Vitest unit tests for each of the 4 protections (mock Redis).

## Notes
- Reference: [ADR-0001](../docs/adr/0001-cost-safety-posture.md).
- Free-tier Upstash: 10K commands/day — more than enough.
- Middleware signature: `withCostSafety((req, { azureResponse }) => Response)` — the handler receives the request and helpers; middleware wraps everything before/after.
- Do NOT ship code that calls Azure without this middleware. T-007 depends on it.
