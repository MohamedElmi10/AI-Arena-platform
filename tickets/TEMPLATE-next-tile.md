# TEMPLATE: adding a tile

**Not a ticket.** A pattern. To add tile N: duplicate this file three times (build / wire / flip), replace `<slug>` and `<Module>`, work in order.

The three-step pattern that turned Foundry Chat Agent Live (T-006 → T-007 → T-008):

## Step 1 — Build the agent in Azure — `T-XXX-<slug>-build.md`

- Create the agent in Azure AI Foundry (or Azure OpenAI / Language / Speech / Translator, whichever this tile uses).
- Endpoint URL + API key → Mohamed's local `.env.local` (never committed).
- `src/app/<module>/<slug>/build.py` — reproducible build script, portfolio surface.
- `src/app/<module>/<slug>/README.md` — what it is, cost model, how to redeploy.
- Cost check: is any backing resource provisioned-tier? If yes, either use the free tier or open a new ADR before proceeding.

## Step 2 — Wire the runtime — `T-XXX-<slug>-wire.md`

- Extend `data/modules.ts` for this tile's `guide` content (About / Try / Expect / Under the hood).
- `app/api/chat/<slug>/route.ts` — wrapped in `withCostSafety(...)`. Non-negotiable.
- Playground consumes the real stream. `<LiveStats>` reads real numbers.
- Handle any tile-specific UI: MCP toggle, multi-agent timeline visualisation, dual-implementation switcher, etc. These go inline in this ticket — don't defer.

## Step 3 — Flip to Live — `T-XXX-<slug>-flip.md`

- `data/modules.ts` → this tile → `status: 'live'`.
- Verify: landing count updates, tile navigates, playground works end-to-end.
- **One-line data change. Nothing else.**

## Order of tile priority (recommended)

Ordered by portfolio impact per unit of build effort:

1. Foundry Chat Agent — done (T-006 → T-008).
2. **Function-Calling Agent** — small step up from #1; teaches tool calling.
3. **RAG Agent with Grounding & Memory** — highest recruiter impact; also the one with the AI Search cost trap (use free tier per ADR-0001).
4. **Text Analysis Agent** (toggle) — Natural Language pillar comes alive.
5. **Multi-Agent Orchestration** — the "wow" tile; save till last because the visualisation is the hardest custom UI.

Everything else in between as time allows.
