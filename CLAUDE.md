# CLAUDE.md — Working instructions for Claude sessions in this repo

Every Claude session that opens this repo should read this file first, then work per the rules below.

## About AI Arena
Public portfolio platform showcasing Mohamed's Azure AI skills. **Portfolio-primary**; code stays readable and maintainable to Mohamed as a hard secondary constraint. The agents themselves live in Azure AI Foundry (or Azure OpenAI); AI Arena is the Next.js UI that wraps and demos them.

- Domain glossary — [`docs/CONTEXT.md`](docs/CONTEXT.md)
- Architectural decisions — [`docs/adr/`](docs/adr/)
- Original prototypes (primary source until superseded) — [`docs/prototypes/`](docs/prototypes/)

## How to work here

1. **Read `docs/CONTEXT.md` first.** It's the shared language for this project.
2. **Skim open ADRs.** If your plan contradicts one, surface it — do not silently overwrite.
3. **Pick a ticket.** Open `tickets/` and take the highest-priority ticket whose `Blocked by:` list contains only tickets already in `tickets/done/`. If the user named a ticket, use that.
4. **Work the ticket.** Follow its Acceptance list. Update `Notes` as you learn. Keep changes small — **one ticket = one commit / PR**.
5. **Close it.** Move the ticket file to `tickets/done/` (git mv). Commit message: `T-XXX: <ticket title>`. If any Acceptance item is unresolved, leave the ticket open and surface why in `Notes`.
6. **Do not open a second ticket in the same session** unless the user explicitly asks.

## Coding conventions

- **Stack:** Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Node.js `openai` package for Azure calls.
- **Server logic** lives in `app/api/` route handlers. Azure keys NEVER touch the browser.
- **Data-driven UI:** modules and tiles come from `data/modules.ts`. Flipping a tile from Planned to Live is a data edit, not a code edit.
- **Tile co-location:** one tile = one folder. Agents tiles under `app/agents/<slug>/`, Gen-AI under `app/genai/<slug>/`, Natural Language under `app/nl/<slug>/`. The tile's `build.py` (or `.md`) documenting how the agent was created in Foundry lives next to its page — this is portfolio surface.
- **Components small and named:** `<Tile>`, `<PlaygroundGuide>`, `<ChatSurface>`, `<LiveStats>`. Prefer duplication over premature abstraction.
- **Fonts:** Fraunces (display) · Inter (body) · JetBrains Mono (metadata). Loaded via `next/font/google`.
- **Colors:** module accents live in one place (see `docs/CONTEXT.md` §Module).

## Cost safety (non-negotiable — see [ADR-0001](docs/adr/0001-cost-safety-posture.md))

Every API route calling Azure MUST wrap the handler in `withCostSafety(handler)`. That middleware enforces:
- `max_tokens: 400` cap.
- IP rate limit (5 msgs / min / IP) via Upstash Redis.
- Daily global budget (500 msgs / day). Over cap → friendly "demo capped for today" response.
- `KILL_SWITCH` env var check. If `true`, respond with "demo paused" and don't call Azure at all.

A PR that adds an Azure-calling route without `withCostSafety` fails review.

## Never do

- Commit `.env` or any file with secrets.
- Call Azure endpoints from client-side code.
- Provision a paid-tier / hourly-billed Azure resource without a new ADR.
- Bundle multiple tickets into one commit.
- Add a dependency that isn't free and open-source.
