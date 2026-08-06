# T-012: MCP Agent — Hosted + Own (whole tile)

**Status:** open
**Blocked by:** —  (build phase is Azure + MCP-server work, independent of the codebase)
**Blocks:** —
**Module:** Agents · **Slug:** `mcp-agent-hosted-own`

## Goal
Ship the MCP tile end-to-end with a **toggle** between a Microsoft-hosted MCP server and Mohamed's own MCP server — same task, two implementations.

## Phase 1 — Build (Azure + own server)
- [ ] Path A: agent calls a **Microsoft-hosted MCP** server for the demo task.
- [ ] Path B: a **self-hosted MCP server** (free/OSS Node or Python) exposing the same tool(s) — local / free tier, no paid hosting.
- [ ] Both paths do the *same* task (true apples-to-apples).
- [ ] Endpoints + keys → `.env.local` — **NOT committed**.
- [ ] `src/app/agents/mcp-agent-hosted-own/build.py` — configures both paths, reproducible + commented.
- [ ] `src/app/agents/mcp-agent-hosted-own/server/` — own-MCP server source + run instructions.
- [ ] `README.md` — what MCP is, hosted-vs-own tradeoffs, cost model, how to run each path.

## Phase 2 — Wire (Next.js)
- [ ] `app/api/chat/mcp-agent-hosted-own/route.ts` — `POST { message, path: 'hosted' | 'own' }`, wrapped in `withCostSafety(...)`. One route, two branches — don't split.
- [ ] Streams via project SSE pattern; indicator shows which path answered.
- [ ] Playground **toggle** (Hosted ⇄ Own) switches path for the same prompt — inline UI, per TEMPLATE Step 2.
- [ ] `data/modules.ts` `guide` added; `<LiveStats>` real; cost-safety errors → friendly bubble.

## Phase 3 — Flip (data)
- [ ] `data/modules.ts` → `mcp-agent-hosted-own` → `status: 'live'` (+ `preview`).
- [ ] Landing Live; counts update; `/agents/mcp-agent-hosted-own` works end-to-end on both toggle paths.

## Notes
- Own MCP server must be free/OSS and self-hostable.
- The contrast is the point — keep the task identical across A and B.
