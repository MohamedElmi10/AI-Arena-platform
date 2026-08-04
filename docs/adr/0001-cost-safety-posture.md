# Cost Safety Posture

AI Arena is a public portfolio; anyone on the internet can hit the demos. To stay solvent on a free-tier budget we combine per-request bounds (`max_tokens` cap), per-visitor bounds (IP rate limit), global bounds (daily budget cap), and an emergency stop (`KILL_SWITCH` env var). All Azure resources are pinned to a single resource group so a one-command delete zeroes the bill, and any tile that would need a provisioned-tier service (currently only the RAG Agent tile, which needs Azure AI Search) runs on the free tier or is refactored to a pay-per-call vector store.

## Considered Options

- **Cloudflare Turnstile or hCaptcha before every message** — rejected. Adds visible friction for the primary audience (recruiters, curious network) and the four layers below handle 99% of expected drainage.
- **Auth wall (GitHub login required to demo)** — rejected. Kills the portfolio pitch. A recruiter who hits sign-in leaves.
- **Paid Azure AI Search tier for the RAG tile** — rejected. Bills by the hour whether idle or not. Free tier (50 MB / 3 indexes) is enough for a demo; a Postgres+pgvector alternative on Neon's free tier is the fallback if the free tier runs out.
- **Session-based limit via `localStorage`** — rejected as a primary defence (trivially bypassed by clearing storage). Acceptable only as UX polish on top of IP rate limiting.

## Consequences

- The RAG Agent tile is constrained to AI Search's free tier: small indexes, limited storage. Any tile that needs more must either accept a provisioned cost (require a new ADR) or substitute a pay-per-call vector store.
- Every API route that calls Azure MUST import the shared `withCostSafety(handler)` middleware. Skipping it is a bug that blocks a PR.
- The `KILL_SWITCH` env var is the single point of "shut it all down NOW." Its behaviour must be tested; a broken kill switch defeats the entire posture.
- Deleting the `rg-ai-arena` resource group wipes every Azure resource. Any state that needs to survive a nuke (e.g. a RAG index) must be reproducible from code in the repo.
