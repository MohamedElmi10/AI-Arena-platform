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
4. **Branch per ticket.** Before touching any code, create a branch off `main` named `t-XXX-<slug>` matching the ticket filename (e.g. `t-003-tile-components`). All work for the ticket lives on that branch.
5. **Work the ticket.** Follow its Acceptance list. Update `Notes` as you learn. Keep changes small — one ticket = one branch. When the work is done, stage the ticket-file move to `tickets/done/` (`git mv`) but leave it uncommitted. If any Acceptance item is unresolved, leave the ticket where it is and surface why in `Notes`.
6. **Claude NEVER commits, merges, or pushes — that's Mohamed's job.** Claude prepares the branch with every change left uncommitted (working tree or staged). Mohamed reviews the diff, commits, merges to `main`, and pushes. Claude does not run `git commit`, `git merge`, `git push`, or `git commit --amend` under any circumstances. (This rule exists because an amend of an already-pushed commit once forced a non-fast-forward push; keeping history in Mohamed's hands prevents that.)
7. **Do not open a second ticket in the same session** unless the user explicitly asks.

### Branch naming

One branch per unit of work, off `main`, lowercase-hyphenated. Prefix by kind:

- `t-XXX-<slug>` — **ticket work.** Matches the ticket filename, e.g. `t-007-wire-foundry-chat-runtime`.
- `docs-<slug>` — **docs-only changes** (CONTEXT/ADR/CLAUDE/README, ticket-text edits), e.g. `docs-sync-project-state`.
- `chore-<slug>` — **housekeeping** not tied to a ticket: moving files, deps, config, tooling, e.g. `chore-tidy-done-tickets`.
- `fix-<slug>` — **a fix outside a ticket** (a bug too small to warrant one), e.g. `fix-tile-hover-jitter`.

Only ticket branches carry a number — it references the `tickets/T-XXX-*.md` file and the `Blocks`/`Blocked by` graph. `docs-`/`chore-`/`fix-` branches are ad-hoc and have no such artifact, so a descriptive slug identifies them (a number would point at nothing and need a maintained counter). The `t-` vs `docs-`/`chore-`/`fix-` prefix also signals planned work vs a side-tidy at a glance.

Mohamed merges every branch via **Squash and merge** (repo default) so `main` stays one commit per branch — no merge bubbles. Don't bundle unrelated work into one branch.

## Coding conventions

- **Stack:** Next.js 16 (App Router, **`src/` dir**) · TypeScript · Tailwind v4 · shadcn/ui (New York / neutral, Radix) · Node.js `openai` package for Azure calls · Vitest for tests. All app code lives under `src/` — paths below like `app/…` and `data/…` mean `src/app/…` and `src/data/…`.
- **Server logic** lives in `src/app/api/` route handlers. Azure keys NEVER touch the browser.
- **Model:** the Foundry Chat Agent runs on **`gpt-5-mini`** (the spec originally said `gpt-4o-mini`, which retired in 2026). Env vars (in `.env.local`, see `.env.local.example`): `AZURE_OPENAI_ENDPOINT` (resource URL **with `/openai/v1/` appended**), `AZURE_OPENAI_API_KEY`, `MODEL_ENDPOINT` (the deployment name), `KILL_SWITCH`.
- **Data-driven UI:** modules and tiles come from `data/modules.ts`. Flipping a tile from Planned to Live is a data edit, not a code edit.
- **Tile co-location:** one tile = one folder. Agents tiles under `app/agents/<slug>/`, Gen-AI under `app/genai/<slug>/`, Natural Language under `app/nl/<slug>/`. The tile's `build.py` (or `.md`) documenting how the agent was created in Foundry lives next to its page — this is portfolio surface.
- **Components small and named:** `<Tile>`, `<PlaygroundGuide>`, `<ChatSurface>`, `<LiveStats>`. Prefer duplication over premature abstraction.
- **Fonts:** Fraunces (display) · Inter (body) · JetBrains Mono (metadata). Loaded via `next/font/google`.
- **Colors:** module accents live in one place (see `docs/CONTEXT.md` §Module).

## Cost safety (non-negotiable — see [ADR-0001](docs/adr/0001-cost-safety-posture.md))

Every API route calling Azure MUST wrap the handler in `withCostSafety(handler)` (built in T-005 — `src/lib/cost-safety.ts`). As shipped it enforces **three** layers (the IP rate limit was dropped — see [ADR-0001 → Update](docs/adr/0001-cost-safety-posture.md)):
- `max_tokens: 1000` cap — via `MAX_OUTPUT_TOKENS` / `clampMaxTokens()`; the handler applies it to its Azure request. (Raised from 400 → 1000 post-T-005; see ADR-0001.)
- Daily global budget (500 msgs / day) — counter in **Netlify Blobs**, UTC-date keyed (auto-resets at midnight). Over cap → 429 `budget_capped`. Fails open if the store is unreachable.
- `KILL_SWITCH=true` env var → 503 `paused`; no Azure call.

A PR that adds an Azure-calling route without `withCostSafety` fails review.

## Never do

- Commit `.env` or any file with secrets.
- Call Azure endpoints from client-side code.
- Provision a paid-tier / hourly-billed Azure resource without a new ADR.
- Bundle multiple tickets into one commit.
- Add a dependency that isn't free and open-source.
