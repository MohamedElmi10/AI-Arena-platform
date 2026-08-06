# T-015: Foundry IQ (whole tile)

**Status:** open
**Blocked by:** —  (build phase is Azure work, independent of the codebase)
**Blocks:** —
**Module:** Agents · **Slug:** `foundry-iq`

## Goal
Ship a standalone Foundry IQ demo end-to-end. Completes the Agents module (7/7).

## Phase 1 — Build (Azure)
- [ ] Foundry IQ configured for a focused, self-contained demo — one clear capability shown well.
- [ ] Confirm the cost tier of any backing resource; if provisioned, use free tier or open an ADR (ADR-0001).
- [ ] Config → `.env.local` — **NOT committed**.
- [ ] `src/app/agents/foundry-iq/build.py` — reproducible + commented, portfolio surface.
- [ ] `README.md` — what Foundry IQ is, what this demo shows, cost model, redeploy steps.

## Phase 2 — Wire (Next.js)
- [ ] `app/api/chat/foundry-iq/route.ts` — `POST`, wrapped in `withCostSafety(...)`.
- [ ] Call the Foundry IQ endpoint, stream via project SSE pattern.
- [ ] `data/modules.ts` `guide` added; any tile-specific UI built inline; `<LiveStats>` real; cost-safety errors → friendly bubble.

## Phase 3 — Flip (data)
- [ ] `data/modules.ts` → `foundry-iq` → `status: 'live'` (+ `preview`).
- [ ] Landing Live; Agents count reflects 7/7 if complete; global summary updates; `/agents/foundry-iq` works end-to-end.

## Notes
- Keep scope tight — a standalone demo, not a second orchestration tile.
- Verify the cost model before building; document it.
