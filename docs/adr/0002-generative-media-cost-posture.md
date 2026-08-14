# Generative-Media Cost Posture

The Insight Visual Data module's **Generative Media** tile exposes two Foundry generation models to anonymous public visitors: image generation and video generation (Sora 2). Image generation bills per image (~$0.01–0.04). Video generation bills **per second of generated video** — dollars per clip, the most expensive operation in the whole platform. AI Arena's existing posture ([ADR-0001](0001-cost-safety-posture.md)) was built for pay-per-call *chat*: `max_tokens` bounds output, and a single global 500-messages/day counter bounds volume. Neither bounds generative-media cost well — `max_tokens` does nothing to image/video billing, and a 500/day *message* budget assumes each call is a ~$0.002 chat turn, not a $2 video. This ADR records how the tile stays solvent.

## Decision

- **Video generation is not run live.** Two or three Sora clips are generated once at build time via the tile's `build.py`, committed to the repo, and played back in the Playground alongside the prompts that produced them. Runtime video cost is **zero**. The clips are labelled as build-time Sora output so the demo is honest, not disguised as live generation.
- **Image generation runs live, behind its own tighter budget.** `withCostSafety(...)` is extended to accept an optional per-route daily limit and Blobs key; the Generative Media image route uses a **25/day** cap on a dedicated key, separate from the 500/day chat budget. Worst case ≈ $1/day.
- Both models stay pay-per-call with **no provisioned/idle billing**, so nothing here bleeds money while idle — the only exposure is per-call, and it is now bounded on both paths.

## Considered Options

- **Live Sora video behind a very tight cap (e.g. 5/day).** Rejected. Puts real dollars behind cap logic that must be perfect against anonymous abuse; a single off-by-one — or the ADR-0001 fail-open on an unreachable Blobs store — bills real money. Fail-open is fine for $0.002 chat turns, not for $2 videos.
- **Drop video entirely.** Rejected. Sora 2 is a capability the path teaches and a strong portfolio signal; a pre-rendered showcase keeps it visible at zero runtime cost.
- **Share the global 500/day budget for image generation.** Rejected as insufficient. 500 images ≈ $10–20/day — right at the ADR-0001 budget-alert ceiling — and it lets image generation starve the chat tiles' budget. A dedicated, tighter key isolates and bounds it.

## Consequences

- `withCostSafety(...)` gains an optional `{ limit, key }` parameter. Its default behaviour (global 500/day) is unchanged, so every existing route is unaffected. The Generative Media image route passes `{ limit: 25, key: "genmedia" }`.
- The Video side of the tile is a curated showcase, not open-ended generation. Refreshing the sample clips is a build-time step, re-run only when Mohamed wants new examples — documented in the tile's `build.py` / README.
- Pre-rendered clips are committed to the public repo. Keep them small and non-sensitive; they are portfolio surface like every other `build.py` artifact.
- The honesty label ("generated with Sora 2 at build time; live video generation is too costly to expose publicly") is itself portfolio signal — it demonstrates cost-aware engineering, which is a competency recruiters scan for.
