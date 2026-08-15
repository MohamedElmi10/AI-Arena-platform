# TEMPLATE: adding a tile

**Not a ticket.** A pattern. **One tile = one ticket**, named `T-XXX-<slug>.md`, with three phase-sections inside it (Build / Wire / Flip). Tile #1 (Foundry Chat) was split across three files T-006→T-008; every tile since is a single ticket — follow the single-ticket shape below.

## Header
```
# T-XXX: <Tile Title> (whole tile)

**Status:** open
**Blocked by:** —            (or the tickets that must close first)
**Blocks:** —                (or the tickets waiting on this one)
**Module:** <Module> · **Slug:** `<slug>`
```

## Body — three phases as sections
- **## Phase 1 — Build (Azure).** Create the agent/model/resource in Foundry (or Azure OpenAI / Language / Speech / Translator / Vision / Document Intelligence). Endpoint + key → local `.env.local` (never committed). `src/app/<module>/<slug>/build.py` (reproducible, portfolio surface) + `README.md` (what it is, **cost model**, redeploy). Commit any **sample assets** the playground ships (sample images/docs, pre-rendered clips). Cost check: anything provisioned / idle-billing? If yes → free tier or a new ADR before proceeding.
- **## Phase 2 — Wire (Next.js + inline UI).** `app/api/.../route.ts` wrapped in `withCostSafety(...)` — non-negotiable. Playground consumes the real stream/response; `<LiveStats>` reads real numbers; `data/modules.ts` `guide` added. **Any custom UI is built inline here** — toggles, overlays, dropzones, timelines. A widget shared by several tiles is built inline in the **first tile that needs it** and reused by later tiles (add a `Blocked by` link); don't split it into its own ticket.
- **## Phase 3 — Flip (data).** `data/modules.ts` → this tile → `status: 'live'` (+ `preview`). Verify counts, navigation, end-to-end. One-line data change. On flip, run the **T-018** corpus pass.

## Order of tile priority (recommended)
Ordered by portfolio impact per unit of build effort:
1. Foundry Chat Agent — done (T-006 → T-008).
2. **Function-Calling Agent** — small step up from #1; teaches tool calling.
3. **RAG Agent with Grounding & Memory** — highest portfolio impact; also the AI Search cost trap (free tier per ADR-0001).
4. **Text Analysis Agent** (toggle) — Natural Language pillar comes alive.
5. **Multi-Agent Orchestration** — the "wow" tile; save till last because the visualisation is the hardest custom UI.

Everything else in between as time allows.
