# Cost Safety Posture

AI Arena is a public portfolio; anyone on the internet can hit the demos. To stay solvent on a free-tier budget we combine per-request bounds (`max_tokens` cap), per-visitor bounds (IP rate limit), global bounds (daily budget cap), and an emergency stop (`KILL_SWITCH` env var). All Azure resources are pinned to a single resource group so a one-command delete zeroes the bill, and any tile that would need a provisioned-tier service (currently only the RAG Agent tile, which needs Azure AI Search) runs on the free tier or is refactored to a pay-per-call vector store.

## Considered Options

- **Cloudflare Turnstile or hCaptcha before every message** — rejected. Adds visible friction for the primary audience and the four layers below handle 99% of expected drainage.
- **Auth wall (GitHub login required to demo)** — rejected. Kills the portfolio pitch. A visitor who hits sign-in leaves.
- **Paid Azure AI Search tier for the RAG tile** — rejected. Bills by the hour whether idle or not. Free tier (50 MB / 3 indexes) is enough for a demo; a Postgres+pgvector alternative on Neon's free tier is the fallback if the free tier runs out.
- **Session-based limit via `localStorage`** — rejected as a primary defence (trivially bypassed by clearing storage). Acceptable only as UX polish on top of IP rate limiting.

## Consequences

- The RAG Agent tile is constrained to AI Search's free tier: small indexes, limited storage. Any tile that needs more must either accept a provisioned cost (require a new ADR) or substitute a pay-per-call vector store.
- Every API route that calls Azure MUST import the shared `withCostSafety(handler)` middleware. Skipping it is a bug that blocks a PR.
- The `KILL_SWITCH` env var is the single point of "shut it all down NOW." Its behaviour must be tested; a broken kill switch defeats the entire posture.
- Deleting the `rg-ai-arena` resource group wipes every Azure resource. Any state that needs to survive a nuke (e.g. a RAG index) must be reproducible from code in the repo.

## Update — runtime implementation (T-005)

The runtime middleware (`src/lib/cost-safety.ts`) ships **three** of the four layers above, with two deliberate changes from the original posture:

- **IP rate limit dropped.** It was the one layer Mohamed didn't ask for. The daily global cap already bounds worst-case daily spend regardless of caller, and `max_tokens: 1000` bounds each request — so per-visitor throttling adds little for a low-traffic portfolio. Removing it also removes a hosted dependency.
- **Store changed from Upstash Redis to Netlify Blobs.** The daily counter still needs external state (serverless instances share no memory), but Netlify Blobs is built into the deploy host (T-009) — no extra third-party account. Trade-off: Blobs does read-modify-write rather than an atomic `INCR`, so under a burst the counter can undercount by a few. At portfolio scale (a 500/day cap, light traffic) that's immaterial; if traffic ever warranted atomicity we'd revisit Redis.
- **Per-request output cap raised 400 → 1000** (`MAX_OUTPUT_TOKENS`, post-T-005). Roomier replies at the cost of ~2.5× worst-case output tokens per message. Still bounded and cheap on gpt-5-mini (1000 output tokens ≈ $0.002); the 500/day global cap and the $5/$10/$20 budget alerts are unchanged, so the daily ceiling holds regardless.

The middleware **fails open** if the Blobs store is unreachable (logs a warning and proceeds) so a store hiccup can't take the demo offline — the `max_tokens` cap and kill switch remain in force either way. Every Azure-calling route must still be wrapped in `withCostSafety(...)`; that rule is unchanged.
