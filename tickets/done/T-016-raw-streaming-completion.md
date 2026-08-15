# T-016: Raw Streaming Completion — Gen-AI (whole tile)

**Status:** open
**Blocked by:** —  (build phase is Azure OpenAI work, independent of the codebase)
**Blocks:** T-009
**Module:** Gen-AI · **Slug:** `raw-streaming-completion`

## Goal
Ship the gen-AI tile end-to-end: **no agent framing** — a raw Azure OpenAI streaming completion, shown **sync vs async side-by-side**. Deliberately close to tile #1's baseline; the contrast taught is sync vs async streaming, not agents. Last tile before deploy — closing this unblocks T-009.

## Phase 1 — Build (Azure OpenAI)
- [ ] Reuse tile #1's `gpt-5-mini` deployment directly — no Foundry agent, no tools, no retrieval, no new resource. Confirm + note.
- [ ] `src/app/genai/raw-streaming-completion/build.py` — demonstrates **both** a sync streaming call and an async streaming call over the Responses API, commented to explain the difference. Reproducible.
- [ ] `README.md` — "raw completion vs agent", sync-vs-async explained, cost model (pay-per-call).

## Phase 2 — Wire (Next.js)
- [ ] `app/api/chat/raw-streaming-completion/route.ts` — `POST { message, mode: 'sync' | 'async' }`, wrapped in `withCostSafety(...)`.
- [ ] Calls Azure OpenAI directly (Node `openai` package — expected for a raw-completion tile per CONTEXT.md §Runtime Path); streams both modes via project SSE pattern.
- [ ] Playground shows the two modes **side-by-side** (or toggle) so the streaming-behaviour difference is visible.
- [ ] `data/modules.ts` `guide` added under the Gen-AI module; `<LiveStats>` real per mode; cost-safety errors → friendly bubble.

## Phase 3 — Flip (data)
- [ ] `data/modules.ts` → Gen-AI → `raw-streaming-completion` → `status: 'live'` (+ `preview`).
- [ ] Landing Live; Gen-AI shows `1 / 1`; global summary updates; `/genai/raw-streaming-completion` works end-to-end (sync + async).

## Notes
- This is the one tile where build.py mirroring the runtime is *the point* — it's the baseline gen-AI primitive the agent tiles build on.
- Reuse `src/lib/sse.ts`; no second streaming pattern.
- On close, **T-009 (Deploy to Netlify) becomes the final unblocked ticket.**
