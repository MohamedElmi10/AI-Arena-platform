# T-014: Multi-Agent Orchestration (whole tile)

**Status:** open
**Blocked by:** —  (build phase is Azure work, independent of the codebase)
**Blocks:** —
**Module:** Agents · **Slug:** `multi-agent-orchestration`

## Goal
Ship the "wow" tile end-to-end: Foundry Workflow + sequential + A2A, several agents collaborating on one task, visualised as a timeline. Hardest custom UI in the project — build it here, don't defer.

## Phase 1 — Build (Azure)
- [x] Foundry Workflow with 2–3 agents in a sequential / A2A arrangement doing one end-to-end task.
- [x] Flow emits structured per-agent steps + handoffs (enough for the timeline to render).
- [x] Config → `.env.local` — **NOT committed**.
- [x] `src/app/agents/multi-agent-orchestration/build.py` — defines workflow + agents, reproducible + commented.
- [x] `README.md` — orchestration shape, each agent's role, **per-run token math** (multiple model calls), redeploy steps.

## Phase 2 — Wire (Next.js + timeline UI)
- [x] `app/api/chat/multi-agent-orchestration/route.ts` — `POST`, wrapped in `withCostSafety(...)`.
- [x] Stream **per-step events** (active agent, handoffs, partial outputs) via project SSE pattern.
- [x] Playground renders a **timeline** of the run: each agent a step, handoffs between them, final result. Readable over clever.
- [x] `data/modules.ts` `guide` added; `<LiveStats>` real (tokens across agents, total latency); cost-safety errors → friendly bubble.

## Phase 3 — Flip (data)
- [x] `data/modules.ts` → `multi-agent-orchestration` → `status: 'live'` (+ `preview`).
- [x] Landing Live; counts update; `/agents/multi-agent-orchestration` works end-to-end with a real run in the timeline.

## Notes
- A multi-agent run spends more per message — watch the ADR-0001 token cap.
- Design the step/handoff output with the timeline in mind; don't make the visualiser decode an opaque blob.
- Save this tile for later (per TEMPLATE priority) — the visualisation is the hard part.

---

## Foundry build notes — 2026-09-07

Built the orchestration in Foundry **Workflows** (classic — retiring **2026-12-01**). **Decision: ship the tile on the current Workflows API now.** This workflow IS the tile's runtime, not a throwaway prototype. Migrate to Microsoft Agent Framework only when forced — the Dec 2026 retirement, or the next time the tile is updated — **not** preemptively. Still to do: Phase-1 `build.py` + README, Phase-2 Next.js wiring.

### Pattern confirmed: sequential + A2A
- Fixed-order chain: `Start → Researcher → Planner → Budget`. Each specialist transforms the previous output.
- Handoff = shared workflow conversation + **per-node output variables**. "Automatically include agent response" must be **ON** on every node.

### Example chosen: **Trip Planner** (dropped marketing — more relatable for recruiters)
- `Trip-Researcher`: trip request → attractions (grouped by type)
- `Trip-Itinerary-Planner`: attractions → day-by-day plan
- `Trip-Budget-Tips`: itinerary → cost estimate (EUR) + local tips
- Open free-text input, e.g. `4 days in Lisbon, love food + history, mid budget`.

### Failure mode found + fixed (README-worthy)
- With a **reasoning model (gpt-5-mini)**, `System.LastMessage` grabbed the model's *reasoning* item (empty / status ERROR) instead of the agent's message → the next agent's guard fired mid-chain. Trace showed `reasoning` output items with `"status_code": "ERROR"`.
- **Symptom:** middle agent replied "Please provide ..." even though upstream produced good output. Final output still looked plausible because the last agent improvised — a *silent middle-agent failure*. Lesson: a multi-agent chain can look fine while a middle step failed; debug **backwards** from the first bad handoff.
- **Fix (two parts):**
  1. Wire inputs to **explicit output variables**, not LastMessage: `researcher → Local.researchOutput → planner input → Local.itineraryOutput → budget input`.
  2. Use a **non-reasoning chat model** (gpt-4o / gpt-4.1-mini). Clears the ERROR reasoning items and cuts tokens.

### Context-loss gotcha
- In a strict sequential chain the last agent never sees the original user input. Budget agent needs the budget level → each agent carries a `Trip: <dest>, <days>, <interests>, <budget>` header line forward. Cheap context propagation without a router.

### Guards (dev-time safety)
- Each agent has an "if input isn't `<expected>`, reply only '...'" line. In the wired chain they should never fire; if one fires mid-run, upstream emitted something malformed.
- Verified: input `hello` → all three refuse cleanly (graceful degradation → maps to the tile's friendly-error bubble).

### Token math (ADR-0001)
- Happy run (Lisbon, 4 days): ~**3,960–4,820** total_tokens across the 3 agents.
- Refused run (`hello`): **586** total_tokens — NOT free: all 3 agents still invoke. Same refusal on gpt-5-mini was **3,059t** → model switch cut refusal cost ~5x.
- Per-message cost = sum of 3+ model calls. Watch the cap.

### Trace shape for the timeline (Phase 2 target)
- `Response → Action "InvokeAzureAgent: <nodeId>" → Output item "<nodeId>: message"`.
- Per-response `usage_info.total_tokens`; per-step `start_time` / `end_time`, `parent_id`, `context.trace_id` / `context.span_id`.
- Each Action = one timeline step; node order = handoff order. Design `build.py` output to expose this cleanly — do NOT hand the visualiser an opaque blob.

### Decisions logged
- **Web search / Bing grounding: NOT in this tile.** Paid connector (breaks free/OSS-only rule), adds cost + latency vs ADR-0001, and off-point for an *orchestration* demo. Researcher uses model knowledge constrained to stable landmarks; tile displays "illustrative — not live data". Grounding = a separate tile if ever pursued.
- **Auto-generated `build.py` (Code tab) is a *caller*, not a *builder*** — references the workflow by name, assumes the agents already exist, and hardcodes the endpoint (must move to `.env.local`; repo is public). Reference snapshot only; the real `build.py` must define agents + workflow reproducibly.
