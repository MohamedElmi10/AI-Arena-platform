# T-013: Microsoft Agent Framework Agent (whole tile)

**Status:** open
**Blocked by:** —  (build phase is Azure + MAF work, independent of the codebase)
**Blocks:** —
**Module:** Agents · **Slug:** `microsoft-agent-framework-agent`

## Goal
Ship the MAF tile end-to-end: the *same* task as a Foundry-native agent, but built with **Microsoft Agent Framework**, so the framework differences are visible side-by-side.

## Phase 1 — Build (Azure + MAF)
- [ ] Agent implemented with **MAF** (free/OSS SDK), task equivalent to an existing Foundry-native tile (fair comparison).
- [ ] Same `gpt-5-mini` deployment — only the framework differs.
- [ ] Config → `.env.local` — **NOT committed**.
- [ ] `src/app/agents/microsoft-agent-framework-agent/build.py` — MAF implementation, reproducible + commented, calling out where MAF differs from Foundry-native.
- [ ] `README.md` — what MAF is, MAF-vs-Foundry-native tradeoffs, cost model.

## Phase 2 — Wire (Next.js)
- [ ] `app/api/chat/microsoft-agent-framework-agent/route.ts` — `POST`, wrapped in `withCostSafety(...)`.
- [ ] Invoke the MAF agent, stream via project SSE pattern. If MAF is Python-hosted, the route calls the hosted endpoint by URL (CONTEXT.md §Runtime Path) — keys stay server-side.
- [ ] `data/modules.ts` `guide` added, framing "same task, different framework".
- [ ] `<LiveStats>` real; cost-safety errors → friendly bubble.

## Phase 3 — Flip (data)
- [ ] `data/modules.ts` → `microsoft-agent-framework-agent` → `status: 'live'` (+ `preview`).
- [ ] Landing Live; counts update; `/agents/microsoft-agent-framework-agent` works end-to-end.

## Notes
- Teaching value is the *diff* — comment build.py "Foundry-native did X this way; MAF does it this way."
- Reuse the SSE parser; no new streaming lib.
