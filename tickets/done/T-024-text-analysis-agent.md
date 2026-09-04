# T-024: Text Analysis Agent (whole tile)

**Status:** done
**Blocked by:** —
**Blocks:** —
**Module:** Natural Language · **Slug:** `text-analysis-agent`

## Goal
Ship the Natural Language pillar's first tile: an agent that **analyses text** —
sentiment, named entities, key phrases, and PII redaction — using Azure AI
Language, run as a tool inside a Foundry-hosted agent.

## Phase 1 — Build (Azure) — DONE
- [x] Foundry-hosted agent `Text-Analysis-Agent-ai-arena` on `gpt-5-mini`, with the
      Azure AI Language capability attached (auto-approve on the tool call).
- [x] `src/app/nl/text-analysis-agent/build.py` — keyless interactive chat client
      (Responses API, `DefaultAzureCredential`), client-side bounded history
      (`history[-12:]`) for memory. Trimmed to the minimum.
- [x] Env: `TEXT_ANALYSIS_AGENT_NAME=Text-Analysis-Agent-ai-arena` in `.env.local`
      (reuses the existing `PROJECT_ENDPOINT`). Never committed.
- [x] Cost: no new provisioned/idle-billing resource — Azure Language is pay-per-call.
- [x] `README.md` next to `build.py` — what it is, why an agent rather than the REST API, the analyse-don't-act hardening, scope change, cost, keyless auth, redeploy.

## Phase 2 — Wire (Next.js) — DONE
- [x] `app/api/chat/text-analysis-agent/route.ts` wrapped in `withCostSafety(...)`
      (ADR-0001). Proxies the browser to the hosted agent, streams SSE. Mirrors the
      rag route minus the citation handling (RAG-only).
- [x] Playground consumes the real stream; `data/modules.ts` `guide` added.
- [x] Agent **instructions hardened** in Foundry: treat every input as *text to
      analyse*, never a command to act on (fixed the "book a flight" drift).

## Phase 3 — Flip (data) — DONE
- [x] `data/modules.ts` → NL → `text-analysis-agent` → `status: 'live'` (+ `preview`).
- [x] Playground works end-to-end (sentiment, entities, key phrases, PII redaction).
- [x] **T-018 corpus pass** — done under T-012. `05-modules-and-tiles.md` no longer
      calls this tile a toggle and records why it shipped as one wiring;
      `11-tile-text-analysis-agent.md` added. Still needs re-ingest into the search
      index — tracked in T-012.

## Scope changes vs the original plan
The planned tile promised **two wirings behind a toggle** (Azure Language as a Foundry
Tool *and* via the Azure Language MCP server, "compare the wiring"). Shipped **one**
wiring only (Foundry Tool). The "two ways / toggle / MCP" framing was dropped from the
tile `tag`, `desc`, `guide`, and `docs/CONTEXT.md` so nothing claims what isn't built.
Restoring the second wiring + a playground toggle is future work if wanted.

## Built here, beyond this tile (reused by all tiles)
- **`TileGuide.greeting`** — a new optional field for a per-tile opening message.
  `Playground` uses `guide.greeting ?? <generic default>`, so existing tiles are
  untouched unless they set one. Per the reusable-widget rule, built in this ticket
  (first tile that needed it) and applied to **all five live tiles** while here.

## Notes
- Memory works the same as every tile: stateless agent, the client/route re-sends the
  last 12 messages (`slice(-12)`) — no `previous_response_id`, no server thread.
- **Deploy (T-009):** Netlify needs `TEXT_ANALYSIS_AGENT_NAME` set, same as the other
  hosted-agent tiles' env.
