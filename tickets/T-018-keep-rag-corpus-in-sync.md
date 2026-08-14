# T-018: Keep the RAG corpus in sync with the platform

**Status:** open (standing — do NOT move to `tickets/done/`; re-run this checklist each time the platform changes)
**Blocked by:** — (corpus edits are independent; only the *re-ingest* step needs T-011's `build.py --ingest` loop to exist)
**Blocks:** —

## Goal
The RAG corpus in `src/app/agents/rag-agent-with-grounding-memory/corpus/` describes
AI Arena and Mohamed as they are *today*. Every time a tile ships, a module lands, the
stack shifts, or Mohamed's story changes, that snapshot goes stale — and because the RAG
agent quotes the corpus as fact and cites it, a stale corpus means the agent misinforms
end users. This is the living checklist for refreshing the corpus and re-ingesting so the
search index matches.

## When to run a corpus pass
Trigger whenever any of these happen:
- A tile flips Planned → Live, or a new agent/tile is built.
- The 4th module (Insight Visual Data) is added.
- The stack, model, or cost-safety posture changes.
- A `[FILL IN]` placeholder in `09-about-mohamed.md` gets real facts, or Mohamed's bio changes.

## What to touch (trigger → files)
**Tile flips Live / new tile built**
- [ ] Add or update that tile's own source doc (mirror `06-tile-foundry-chat-agent.md` / `07-tile-function-calling-agent.md`).
- [ ] `05-modules-and-tiles.md` — the tile map and the "N tiles Live" line.
- [ ] `10-common-questions.md` — the "What's built so far?" answer.
- [ ] `08-tile-rag-agent.md` — only if the change is to the RAG tile itself.

**4th module (Insight Visual Data) added**
- [ ] `05-modules-and-tiles.md` — module list; "three modules ... fourth planned" → four.
- [ ] `01-about-ai-arena.md` — modules overview.
- [ ] `03-tech-stack.md` — module accent colors.

**Stack / model change (Next version, `gpt-5-mini`, embeddings)**
- [ ] `03-tech-stack.md`, plus the model references in `06` / `07` / `08`.

**Cost-safety change**
- [ ] `04-cost-safety.md` — keep it in step with `docs/adr/0001` and `docs/CONTEXT.md`.

**Bio / placeholders**
- [ ] `09-about-mohamed.md` — fill or update; delete any `[FILL IN]` that stays unknown.
- [ ] `10-common-questions.md` — the "How do I reach Mohamed?" answer.

## Acceptance (each pass)
- [ ] Every file the trigger touches is updated and matches the repo (`docs/CONTEXT.md`, `data/modules.ts`, the ADRs).
- [ ] No `[FILL IN: ...]` placeholder is left in any file that gets ingested.
- [ ] Nothing invented — every claim traces to the repo or to a fact Mohamed confirms.
- [ ] Re-ingest: `python src/app/agents/rag-agent-with-grounding-memory/build.py --ingest` so the `ai-arena-rag` index matches the edited files. (Needs T-011's ingest loop; skip until that exists.)
- [ ] Spot-check: ask the live RAG tile one question about the change; confirm it answers correctly and cites the right source.

## Notes
- Living ticket. Unlike normal tickets it stays in `tickets/` and is re-run; each pass can be its own small `docs-` commit.
- The corpus convention lives in `corpus/README.md` (one file = one source; each factual, ~150–350 words).
- Highest-risk doc for drift in the whole repo, because the agent presents it as ground truth. When in doubt, delete a stale claim rather than leave it wrong.
