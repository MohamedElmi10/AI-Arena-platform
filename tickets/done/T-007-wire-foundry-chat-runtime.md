# T-007: Wire Foundry Chat Agent runtime

**Status:** done
**Blocked by:** T-004, T-005, T-006
**Blocks:** T-008

## Goal
Replace the fake stream in the Foundry Chat Agent playground with a real Azure streaming call, gated by the cost-safety middleware.

## Acceptance
- [ ] `app/api/chat/foundry-chat-agent/route.ts` handles `POST` with `{ message: string }`.
- [ ] Handler wrapped in `withCostSafety(...)` from T-005. A route that isn't wrapped fails review.
- [ ] Calls the Foundry endpoint via Node `openai` package (`openai.responses.create({ stream: true, ... })`) using `AZURE_OPENAI_ENDPOINT` + `AZURE_OPENAI_API_KEY` from env.
- [ ] Streams `response.output_text.delta` events back to the client (SSE or a `Response` body with a `ReadableStream`).
- [ ] Client `<ChatSurface>` consumes the stream, updates the current bubble in real time.
- [ ] `<LiveStats>` reads real values:
  - `Tokens`: count of delta events (or accumulated string length, whichever is honest).
  - `Latency`: `performance.now()` at first delta vs. request start.
  - `Status`: flips `idle → streaming → idle`.
- [ ] Cost-safety errors (rate limited, budget capped, kill switch) render as a distinct assistant bubble with the friendly message, not a raw JSON dump.

## Notes
- Pick **one** streaming pattern for the whole project — Vercel AI SDK (`ai` package) or hand-rolled SSE — and commit to it. No mixing.
- Runtime path per `docs/CONTEXT.md` §Runtime Path: browser → API route → Foundry endpoint → back. No client-side Azure calls, ever.
- If Foundry access shifted to Azure OpenAI in T-006, the openai package call is nearly identical — just the endpoint URL changes.

### As-built
- **Streaming pattern chosen: hand-rolled SSE** (no `ai` package). Route emits `data: {json}\n\n` frames; client reads via `response.body.getReader()`. Rationale: zero new client deps, readable for a public portfolio, and it teaches the real mechanics. This is the project-wide pattern now — later streaming tiles reuse it.
- Added the `openai` npm package (v7) — it wasn't installed; it's the CLAUDE.md-declared stack and free/OSS.
- Files: `src/app/api/chat/foundry-chat-agent/route.ts` (POST, `withCostSafety`, `clampMaxTokens` applied to the payload), `src/lib/foundry.ts` (shared `SYSTEM_PROMPT` + Azure client, mirrors `build.py`), `src/lib/sse.ts` (+ `sse.test.ts`, 8 tests) for the client-side frame parser. `Playground.tsx` now fetches `/api/chat/<slug>` and drives `<LiveStats>` from real deltas (Tokens = live delta count, reconciled to real `usage.output_tokens` on the `done` frame; Latency = first-delta time; Status idle→streaming→idle). Cost-safety non-200s render as a friendly assistant bubble.
- Tile stays `status: "planned"` in `data/modules.ts` — flipping to Live is **T-008**, a data edit.

### Verified
- `npm run lint` clean · `npx vitest run` 15/15 green · `npx tsc --noEmit` reports **zero errors in T-007 files**.
- **Not run in-sandbox:** live end-to-end call to Azure (needs real `.env.local` + network) and `next build` (blocked here only by Google-Fonts fetch — environmental, not code). **Smoke-test locally before committing:** `netlify dev`, open `/agents/foundry-chat-agent`, send a prompt, confirm the stream + stats; then flip `KILL_SWITCH=true` and confirm the friendly paused bubble.

### Flags for Mohamed (not fixed here — would bundle into T-007)
- Pre-existing type error on `main`: `src/lib/cost-safety.test.ts:37` — `clampMaxTokens({})` trips TS because the constraint is a weak type. tsconfig includes test files, so a networked `next build` would catch it. Suggest a separate `fix-clamp-empty-payload-type` branch (e.g. `clampMaxTokens<{ max_output_tokens?: number }>({})`).
- `withCostSafety` reserves a budget count *before* the handler runs, so a malformed 400 still consumes one message against the daily cap. Immaterial at portfolio scale; noting it since it's T-005 behaviour, not something to change here.
