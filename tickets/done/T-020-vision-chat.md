# T-020: Vision Chat (whole tile)

**Status:** done — corpus pass batched into the next T-018 run
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
- [x] `src/app/vision/[slug]/page.tsx` created — first Vision tile, so nothing mapped `/vision/<slug>` to a page before this.
- [x] `app/api/chat/vision-chat/route.ts` — `POST { message, messages, image }`, `withCostSafety(handler, { limit: 100, key: "vision" })`. Own budget key: an image is ~750-1,300 input tokens and this tile re-sends one every turn.
- [x] Takes the data URL the browser produces, validates type and size, calls Azure OpenAI via Node `openai`, streams `output_text.delta` on the T-007 SSE pattern.
- [x] `ImageDropzone` — drag/drop, picker, preview, downscale to 1536px, rejects >8MB and non-images on the browser's sniffed MIME type rather than the filename. Reusable; T-022 and T-023 consume it. Sample chips tap to load a committed image **and** its matching prompt, routed through the same resize path as an upload so the request looks identical either way.
- [x] `ChatSurface` streams, `<LiveStats>` real, cost-safety errors render as a friendly bubble. The picture sits above the chat rather than inside the user bubble — it is the same image for the whole conversation, so repeating it per message would be noise.
- [x] `data/modules.ts` `guide` added.
- [x] **History policy: re-attach the image on every turn**, with the last 6 turns
      of text.

      The cheap alternative was to send the image once and let the model answer
      follow-ups from its own first description. At 100 messages/day on
      `gpt-5-mini` the saving is pennies, and the cost is that a question about a
      detail the model never mentioned — "what colour is the cable?" — cannot be
      answered by looking again. A tile whose whole promise is *ask about this
      picture* has to keep being able to see it.

      Accepted trade: every turn pays the 3-4s image read. The "reading the
      image…" indicator therefore runs on every message, not just the first.

- [x] **Generation feedback:** "reading the image…" pulses in the module accent until the first token, on *every* turn — the image is re-sent each time, so the 3-4s read is not a first-load cost. `motion-safe:` respects `prefers-reduced-motion`.
## Phase 3 — Flip (data)
- [x] `status: 'live'` with a `preview`. First tile in Insight Visual Data.
- [x] Verified locally: landing shows 1 / 4 live, `/vision/vision-chat` works with a sample and with an upload.
- [~] **T-018 corpus pass — deliberately deferred.** More tiles are going live
      shortly, and a corpus pass costs a blob upload plus an indexer run each time,
      so they are being batched. Until then the RAG tile answers "7 live" and will
      not know Vision Chat exists. Owed: `05-modules-and-tiles.md`,
      `10-common-questions.md`, and a new `14-tile-vision-chat.md`. Tracked in T-018.

## Notes
- Images are per-message, never stored. Downscale is the input-cost bound; `max_tokens` only bounds output.
- Confirm the chosen deployment actually accepts image input before closing.
- On flip, run the **T-018** corpus pass for this tile.
