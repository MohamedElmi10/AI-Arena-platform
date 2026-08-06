# T-014: Multi-Agent Orchestration (whole tile)

**Status:** open
**Blocked by:** —  (build phase is Azure work, independent of the codebase)
**Blocks:** —
**Module:** Agents · **Slug:** `multi-agent-orchestration`

## Goal
Ship the "wow" tile end-to-end: Foundry Workflow + sequential + A2A, several agents collaborating on one task, visualised as a timeline. Hardest custom UI in the project — build it here, don't defer.

## Phase 1 — Build (Azure)
- [ ] Foundry Workflow with 2–3 agents in a sequential / A2A arrangement doing one end-to-end task.
- [ ] Flow emits structured per-agent steps + handoffs (enough for the timeline to render).
- [ ] Config → `.env.local` — **NOT committed**.
- [ ] `src/app/agents/multi-agent-orchestration/build.py` — defines workflow + agents, reproducible + commented.
- [ ] `README.md` — orchestration shape, each agent's role, **per-run token math** (multiple model calls), redeploy steps.

## Phase 2 — Wire (Next.js + timeline UI)
- [ ] `app/api/chat/multi-agent-orchestration/route.ts` — `POST`, wrapped in `withCostSafety(...)`.
- [ ] Stream **per-step events** (active agent, handoffs, partial outputs) via project SSE pattern.
- [ ] Playground renders a **timeline** of the run: each agent a step, handoffs between them, final result. Readable over clever.
- [ ] `data/modules.ts` `guide` added; `<LiveStats>` real (tokens across agents, total latency); cost-safety errors → friendly bubble.

## Phase 3 — Flip (data)
- [ ] `data/modules.ts` → `multi-agent-orchestration` → `status: 'live'` (+ `preview`).
- [ ] Landing Live; counts update; `/agents/multi-agent-orchestration` works end-to-end with a real run in the timeline.

## Notes
- A multi-agent run spends more per message — watch the ADR-0001 token cap.
- Design the step/handoff output with the timeline in mind; don't make the visualiser decode an opaque blob.
- Save this tile for later (per TEMPLATE priority) — the visualisation is the hard part.
