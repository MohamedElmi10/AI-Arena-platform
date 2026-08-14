# T-020: Vision Chat (whole tile)

**Status:** open
**Blocked by:** — (build phase is Azure work, independent of the codebase)
**Blocks:** T-022, T-023
**Module:** Insight Visual Data · **Slug:** `vision-chat`

## Goal
Ship the Vision Chat tile end-to-end: a vision-enabled chat agent — pick a **sample image** or upload your own, ask about it, get a streamed answer grounded in the pixels. The "it can see" analog of the Foundry Chat Agent.

## Phase 1 — Build (Azure)
- [ ] Vision-capable agent in Foundry inside `rg-ai-arena` — reuse `gpt-5-mini` if that deployment accepts image input; else the cheapest vision-capable model (record the choice in the README).
- [ ] System prompt tuned for portfolio demos: neutral, concise; describes / reads / reasons over the image; no roleplay; no system-prompt reveal.
- [ ] 2 committed **sample images** (e.g. a chart + a street scene) under the tile folder — portfolio assets, tap-to-load in the UI.
- [ ] Endpoint URL + key → `.env.local` — **NOT committed**.
- [ ] `src/app/vision/vision-chat/build.py` — image + prompt via the Responses API, reproducible + commented.
- [ ] `README.md` — what it is; cost (**pay-per-call, ~$0.002–0.003/message**; images are *input* tokens, so the 1536px downscale is the real bound); redeploy steps.

## Phase 2 — Wire (Next.js + inline UI)
- [ ] `app/api/chat/vision-chat/route.ts` — `POST { message, image }`, wrapped in `withCostSafety(...)`. Unwrapped = fails review.
- [ ] Encodes the image server-side, calls the Foundry vision endpoint via Node `openai`, streams `output_text.delta` (project SSE pattern from T-007).
- [ ] Inline UI — build **`ImageDropzone`** (drag/drop + picker, inline preview, in-browser downscale ≤1536px longest edge, reject >4MB / non-image) **plus a sample-image gallery** (tap a committed sample to load it). Build `ImageDropzone` reusable — T-022 and T-023 consume it.
- [ ] User bubble shows the image thumbnail; `ChatSurface` streams; `<LiveStats>` real; cost-safety errors → friendly bubble.
- [ ] `data/modules.ts` `guide` added.

- [ ] **Generation feedback:** a “reading the image…” pulsing indicator (module accent) before the first token, then the existing token-stream; `<LiveStats>` Status `idle → generating → done`. Respect `prefers-reduced-motion`.
## Phase 3 — Flip (data)
- [ ] `data/modules.ts` → `vision-chat` → `status: 'live'` (+ `preview`).
- [ ] Landing Live; Insight Visual Data `1 / 4`, global `12 / 15`; `/vision/vision-chat` works end-to-end (sample + own upload).

## Notes
- Images are per-message, never stored. Downscale is the input-cost bound; `max_tokens` only bounds output.
- Confirm the chosen deployment actually accepts image input before closing.
- On flip, run the **T-018** corpus pass for this tile.
