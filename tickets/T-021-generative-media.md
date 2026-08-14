# T-021: Generative Media (whole tile)

**Status:** open
**Blocked by:** — (Azure + build-time work)
**Blocks:** —
**Module:** Insight Visual Data · **Slug:** `generative-media`

## Goal
Ship the Generative Media tile end-to-end: prompt in, media out, with a **toggle** between live **Image** generation and pre-rendered **Video** (Sora). Cost posture per [ADR-0002](../docs/adr/0002-generative-media-cost-posture.md).

## Phase 1 — Build (Azure + build-time)
- [ ] Image-generation model deployed in Foundry inside `rg-ai-arena` (pay-per-call, ~$0.01–0.04/image).
- [ ] `src/app/vision/generative-media/build.py` — (a) creates/documents the image deployment; (b) generates **2–3 Sora clips** from fixed prompts at build time, saving clips + prompts as committed assets under `samples/`.
- [ ] `README.md` — cost (image live behind a 25/day key; **video pre-rendered, $0 runtime** — Sora is **$0.10/second**, so live public gen is out; log the one-time build spend), pointer to ADR-0002.
- [ ] Endpoint / key → `.env.local` — **NOT committed**.

## Phase 2 — Wire (Next.js + inline UI)
- [ ] Extend `withCostSafety(...)` to accept an optional `{ limit, key }` (default unchanged = global 500/day). Per ADR-0002. Update `lib/cost-safety.test.ts` (default path unchanged).
- [ ] `app/api/generate/generative-media/route.ts` (image path) wrapped in `withCostSafety({ limit: 25, key: "genmedia" })`; returns the generated image. **Video path is not a live route.**
- [ ] Inline UI — build **`MediaGenSurface`** (prompt + Generate + output canvas) and **`ImplementationToggle`** (Image ⇄ Video). Build the toggle generic/reusable (the MCP tile T-012 and Text Analysis tile want it too). Video side plays the committed sample clips with their prompts.
- [ ] `data/modules.ts` `guide` added; `<LiveStats>` real; cost-safety errors → friendly bubble.

- [ ] **Generation feedback:** the output canvas shows a shimmering skeleton (module accent) while the image generates, then the image fades/scales in; the Video side shows a brief spinner, then plays. Respect `prefers-reduced-motion`.
## Phase 3 — Flip (data)
- [ ] `data/modules.ts` → `generative-media` → `status: 'live'` (+ `preview`).
- [ ] Landing Live; Insight Visual Data `2 / 4`, global `13 / 15`; image generates live; Video toggle plays samples.

## Notes
- `max_tokens` is irrelevant to image billing — the 25/day key is the bound.
- ADR-0002 is the source of truth for the cost posture; keep the README in step.
- On flip, run the **T-018** corpus pass for this tile.
