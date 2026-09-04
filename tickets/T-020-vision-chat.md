# T-020: Vision Chat (whole tile)

**Status:** open
**Blocked by:** — (build phase is Azure work, independent of the codebase)
**Blocks:** T-022, T-023
**Module:** Insight Visual Data · **Slug:** `vision-chat`

## Goal
Ship the Vision Chat tile end-to-end: a vision-enabled chat agent — pick a **sample image** or upload your own, ask about it, get a streamed answer grounded in the pixels. The "it can see" analog of the Foundry Chat Agent.

## Phase 1 — Build (Azure)
- [x] **No new resource needed.** `gpt-5-mini` accepts image input on the Responses API, streaming included, so this reuses the chat tiles' deployment. Also no Foundry *agent* — there is no tool to attach, so the tile calls the model directly like the Gen-AI tiles do.
- [x] System prompt written, same posture as the other tiles.
- [x] 3 committed **sample images**, one per job, each paired with its prompt in
      `JOBS` so the guide and the samples cannot drift. 436 KB total.
      One of them arrived as a PNG named `.jpeg` — `to_data_url` reads the suffix, so
      it announced the wrong media type and worked only because Azure sniffs the real
      format. **Phase 2 must check the bytes, not the filename**, since the uploads
      come from strangers.
- [x] No new env vars at all — `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY` and `MODEL_ENDPOINT` already existed. Auth is the **key**, matching `getFoundryClient()` at runtime; keyless returns `401 invalid_issuer` against this endpoint.
- [x] `build.py` — A/B/C/D menu, streaming, token and latency readouts.
- [x] `README.md` — with the measurements below.

### Measured, not assumed — the cost story is the opposite of the plan

Same image, two resolutions, same question:

| file | pixels | on disk | input tokens | first token |
|---|---|---|---|---|
| `big.jpg` | 4096px | 1.4 MB | **753** | 4.0s |
| `small.jpg` | 1536px | 376 KB | **753** | 3.0s |

**Identical.** Azure normalises the image before charging, so resolution above its
threshold is free. Other samples landed at 1,049 (1280×906) and 1,300 (a phone
photo) — all in the same band. An image costs roughly 750–1,300 input tokens
whatever you send it.

Consequences:

- **The browser resize is not a cost control.** It buys ~1s of latency and a
  smaller upload, which matters on mobile. Keep it, but for that reason, and stop
  calling it the cost bound.
- **The bill scales with messages, not megapixels.** So the things that actually
  bound spend are the daily budget key and the history policy — whether the image
  rides along on every turn.
- The portal's 5,224 for a 1024px image was portal overhead, not the picture.
  Measure through your own code before believing a number from a playground.

## Phase 2 — Wire (Next.js + inline UI)
- [ ] Ensure the module route `src/app/vision/[slug]/page.tsx` exists — if this is the first Vision tile to ship, create it (mirrors `agents/[slug]` · `genai/[slug]` · `nl/[slug]`); a live tile 404s without it.
- [ ] `app/api/chat/vision-chat/route.ts` — `POST { message, image }`, wrapped in `withCostSafety(...)`. Unwrapped = fails review.
- [ ] Encodes the image server-side, calls the Foundry vision endpoint via Node `openai`, streams `output_text.delta` (project SSE pattern from T-007).
- [ ] Inline UI — build **`ImageDropzone`** (drag/drop + picker, inline preview, in-browser downscale ≤1536px longest edge, reject >4MB / non-image) **plus a sample-image gallery** (tap a committed sample to load it). Build `ImageDropzone` reusable — T-022 and T-023 consume it. The downscale is for upload time and ~1s of latency, **not** cost — see the measurements. Reject on sniffed bytes, not extension.
- [ ] User bubble shows the image thumbnail; `ChatSurface` streams; `<LiveStats>` real; cost-safety errors → friendly bubble.
- [ ] `data/modules.ts` `guide` added.
- [ ] **Decide the history policy.** Text-only history with the image attached on
      the first turn only, versus re-sending it every turn. This is the actual cost
      lever on this tile, since one image is ~750-1,300 tokens and the count scales
      with messages, not pixels. Test follow-ups ("and the other one?") before choosing.

- [ ] **Generation feedback:** a “reading the image…” pulsing indicator (module accent) before the first token, then the existing token-stream; `<LiveStats>` Status `idle → generating → done`. Respect `prefers-reduced-motion`.
## Phase 3 — Flip (data)
- [ ] `data/modules.ts` → `vision-chat` → `status: 'live'` (+ `preview`).
- [ ] Landing Live; the Insight Visual Data live-count increments by one; `/vision/vision-chat` works end-to-end (sample + own upload).

## Notes
- Images are per-message, never stored. Downscale is the input-cost bound; `max_tokens` only bounds output.
- Confirm the chosen deployment actually accepts image input before closing.
- On flip, run the **T-018** corpus pass for this tile.
