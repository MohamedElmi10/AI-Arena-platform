# T-011: RAG Agent with Grounding & Memory (whole tile)

**Status:** open
**Blocked by:** —  (build phase is Azure work, independent of the codebase)
**Blocks:** —
**Module:** Agents · **Slug:** `rag-agent-with-grounding-memory`

## Goal
Ship the RAG tile end-to-end. Highest portfolio impact — and the one with the Azure AI Search cost trap. Retrieval + grounded citations + memory across turns.

## Phase 1 — Build (Azure)
- [ ] **Cost trap first:** Azure AI Search is provisioned-tier. Use the **Free tier** per ADR-0001, or open a new ADR. Leave no hourly-billed resource running.
- [ ] Small demo corpus (a few docs about AI Arena / Mohamed) ingested into an AI Search index (Free tier).
- [ ] Agent configured for retrieval + grounding (answers cite retrieved sources) + memory across turns.
- [ ] Endpoint + key + index name → `.env.local` — **NOT committed**.
- [ ] `src/app/agents/rag-agent-with-grounding-memory/build.py` — creates index, uploads docs, configures grounding. Reproducible + commented.
- [ ] `README.md` — what it is, **Search Free-tier cost note + limits**, redeploy + clean-delete steps.

## Phase 2 — Wire (Next.js)
- [ ] `app/api/chat/rag-agent-with-grounding-memory/route.ts` — `POST`, wrapped in `withCostSafety(...)`.
- [ ] Retrieval → grounded generation → stream (project SSE pattern).
- [ ] Citations rendered in the playground (`[1]` markers + sources list) — only cite what was actually retrieved.
- [ ] Memory: earlier turns carried into later requests (document client-held vs server; keep history bounded so it can't blow the token cap).
- [ ] `data/modules.ts` `guide` added; `<LiveStats>` real; cost-safety errors → friendly bubble.

## Phase 3 — Flip (data)
- [ ] `data/modules.ts` → `rag-agent-with-grounding-memory` → `status: 'live'` (+ `preview`).
- [ ] Landing Live; counts update; `/agents/rag-agent-with-grounding-memory` works end-to-end (grounded answer + citations + memory across two turns).

## Notes
- Fully-pay-per-call alternative: Postgres + pgvector on Neon free tier (CONTEXT.md §Cost) — note in README + ADR if chosen.
- Flip last, one-line data edit, verify.
