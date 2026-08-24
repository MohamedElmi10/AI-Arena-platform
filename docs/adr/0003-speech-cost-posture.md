# Speech Cost Posture

The Natural Language module's **Speech Assistant** tile (T-025) exposes Azure Speech to anonymous public visitors. AI Arena's baseline posture ([ADR-0001](0001-cost-safety-posture.md)) bounds each request with `max_output_tokens` — the right lever for chat, where cost tracks the text the model writes. Speech bills on two entirely different axes: **audio duration in** (speech-to-text and speech translation, ~$1 per audio hour real-time) and **characters synthesised out** (neural text-to-speech, ~$16 per million characters). `clampMaxTokens()` touches neither. This is the same class of mismatch [ADR-0002](0002-generative-media-cost-posture.md) recorded for image and video generation, and it needs the same treatment: a per-request bound that measures the thing that actually costs, plus a dedicated daily budget.

Honest traffic is not the concern. A visitor genuinely trying the tile — a couple of minutes of speech, a handful of spoken replies — costs about five cents; ten such visitors a day is roughly $15/month. The exposure is per-request size. The route is a public URL, so the browser UI is not the only caller: one POST carrying a three-hour recording costs ~$3 and consumes a single slot against ADR-0001's 500/day counter, which counts *requests*, not minutes.

## Decision

- **Standalone Azure Speech resource on the Standard (S0) tier**, in `rg-ai-arena`, called directly via the Speech SDK. Not the Foundry resource — Foundry has no F0 path and provisions Speech at S0 regardless, and a separate resource keeps the Speech line item legible and separately deletable.
- **Two per-request bounds, enforced in the route before any Azure call.** These are the speech equivalent of `max_output_tokens`:
  - `MAX_AUDIO_SECONDS = 30` — reject an upload longer than this. Worst case ≈ $0.008 per request.
  - `MAX_SYNTHESIS_CHARS = 800` — reject synthesis input above this. Worst case ≈ $0.013 per request.
  - Together: **~$0.02 is the most any single request can cost.**
- **Dedicated daily budget key**, using the optional `{ limit, key }` parameter [ADR-0002](0002-generative-media-cost-posture.md) added to `withCostSafety(...)`: `{ limit: 100, key: "speech" }`. Worst-case daily exposure ≈ **$2**, comfortably under ADR-0001's $5/$10/$20 alert ladder.
- **Speech translation counts against the same audio-seconds bound.** It is one `TranslationRecognizer` call billed per audio hour at a higher rate than plain transcription; the 30-second cap bounds it identically.
- **No provisioned Speech resources.** No custom speech model, no custom neural voice. Both are hourly-billed custom endpoints (`docs/CONTEXT.md` §Pay-per-call vs Provisioned) and would each need their own ADR. The tile teaches the recognition-side / synthesis-side customisation boundary in its README and guide copy without deploying either.

## Considered Options

- **Free (F0) tier.** Rejected. F0 cannot bill — it throttles at 429 and accrues no overage, which is genuinely attractive. But its concurrent request limit is **1, and not adjustable**, and real-time TTS is capped at 20 transactions per 60 seconds. The second simultaneous visitor gets an error. A portfolio tile that breaks when two people open it at once is a worse artifact than a $2/day ceiling; zero cost is not worth a demo that 429s in front of a recruiter. F0 remains fine for local `build.py` development, where one developer means the concurrency limit never bites.
- **Share the global 500/day chat budget.** Rejected, for ADR-0002's reason. A capped speech request costs roughly ten times a chat turn, and 500 of them would both blow past the alert ladder and let one tile starve every other tile's budget. A dedicated key isolates it.
- **Trust the browser UI to keep clips short.** Rejected. The recording length is enforced client-side only if the client is the one we shipped. The route is public; the cap belongs on the server.
- **Batch transcription instead of real-time** (~$0.36 vs ~$1.00 per audio hour). Rejected for this tile. Batch is asynchronous, queued, and requires blob storage with SAS URLs — the same second-resource and secret-handling burden that got the Speech MCP route dropped from T-025. At a 30-second cap the saving is fractions of a cent per request; it buys nothing and costs the live-demo feel.

## Consequences

- `withCostSafety(...)` needs **no new capability**. The `{ limit, key }` parameter from ADR-0002 covers the budget layer; the two new caps are speech-specific and live in the speech route rather than the shared middleware.
- **The 30-second cap shapes the demo.** This is a "say a sentence and hear it back" tile, not a "transcribe your podcast" tile. The guide copy and the rejection message must say so plainly, so a truncated upload reads as a designed boundary rather than a bug.
- Rejections are cheap and must stay that way: both caps are checked **before** the Azure client is constructed, so a rejected request costs nothing.
- ADR-0001's fail-open behaviour still applies — if the Netlify Blobs store is unreachable, the daily counter is skipped and only the per-request caps and `KILL_SWITCH` bound cost. At ~$0.02 per request that is an acceptable failure mode, unlike ADR-0002's reasoning about $2 videos.
- Deleting `rg-ai-arena` still zeroes the bill. The Speech resource holds no state that needs to survive a nuke; the custom lexicon lives in the repo.
