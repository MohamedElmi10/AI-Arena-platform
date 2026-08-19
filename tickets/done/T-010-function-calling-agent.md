# T-010: Function-Calling Agent (whole tile)

**Status:** open
**Blocked by:** —  (build phase is Azure work, independent of the codebase)
**Blocks:** —
**Module:** Agents · **Slug:** `function-calling-agent`

## Goal
Ship the Function-Calling Agent tile end-to-end — build in Azure, wire the runtime, flip to Live in one ticket. First step up from the baseline: teaches tool calling + the async tool-call loop.

## Phase 1 — Build (Azure)
- [ ] Agent deployed in Azure AI Foundry inside `rg-ai-arena` (reuse T-006's project). Model `gpt-5-mini`.
- [ ] 1–2 small, safe demo tools (e.g. `get_current_time`, `calculate(expression)`) — no paid API.
- [ ] Full tool-call round-trip: agent calls tool → gets result → produces grounded answer.
- [ ] Endpoint + key → `.env.local` — **NOT committed**.
- [ ] `src/app/agents/function-calling-agent/build.py` — reproducible, commented, portfolio surface (shows tool schema + async round-trip).
- [ ] `src/app/agents/function-calling-agent/README.md` — what it is, cost model (pay-per-call), redeploy steps.

## Phase 2 — Wire (Next.js)
- [ ] `app/api/chat/function-calling-agent/route.ts` — `POST { message }`, wrapped in `withCostSafety(...)`. Unwrapped = fails review.
- [ ] Server-side tool-call loop; stream final answer via the project SSE pattern (T-007 As-built — no new streaming lib).
- [ ] `data/modules.ts` `guide` added (About / Try / Expect / Under the hood).
- [ ] Playground shows a "🔧 called `tool_name`" indicator inline so the round-trip is visible.
- [ ] `<LiveStats>` real Tokens / Latency / Status; cost-safety errors → friendly bubble.

## Phase 3 — Flip (data)
- [ ] `data/modules.ts` → `function-calling-agent` → `status: 'live'` (+ `preview`).
- [ ] Landing renders Live; Agents + global counts update to actual live count.
- [ ] `/agents/function-calling-agent` works end-to-end with a real tool call.

## Notes
- Tools stay trivial/safe — the point is to *show* function calling, not build integrations.
- Reuse `src/lib/foundry.ts` + `src/lib/sse.ts`. One streaming pattern project-wide.
- Flip is a one-line data edit — do it last, verify, don't bundle unrelated changes.
