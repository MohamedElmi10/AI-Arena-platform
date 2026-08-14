# RAG Corpus

The knowledge base for the **RAG Agent with Grounding & Memory** tile. Every
`.md` file in this folder is a source the agent can retrieve from and cite.

## How it's used

`build.py --ingest` reads each file in this folder, splits it into chunks,
embeds each chunk with `text-embedding-3-small`, and uploads them to the
`ai-arena-rag` index in Azure AI Search (Free tier). At query time the agent
does a hybrid (vector + keyword) search, feeds the top matches to `gpt-5-mini`,
and answers **only** from them — citing each claim as `[n]`.

## Conventions

- **One file = one source.** The `# H1` on line 1 is the source's display name
  (what shows up next to a `[n]` citation).
- **Keep each file focused and factual.** ~150–350 words per file chunks
  cleanly and keeps citations precise. Split a topic rather than letting one
  file sprawl.
- **Only put things here that are true and citable.** The agent will quote this
  material as fact. Anything speculative or unverified does not belong in the
  corpus.
- **Placeholders.** Text marked `[FILL IN: ...]` is a gap Mohamed must complete
  before ingest — the agent should never be fed a placeholder as if it were a
  fact.

## Files

| File | Source |
|------|--------|
| `01-about-ai-arena.md` | What AI Arena is |
| `02-how-it-works.md` | Runtime architecture |
| `03-tech-stack.md` | Stack & design system |
| `04-cost-safety.md` | Cost-safety posture |
| `05-modules-and-tiles.md` | The module + tile map |
| `06-tile-foundry-chat-agent.md` | Tile: Foundry Chat Agent |
| `07-tile-function-calling-agent.md` | Tile: Function-Calling Agent |
| `08-tile-rag-agent.md` | Tile: this RAG agent |
| `09-about-mohamed.md` | About Mohamed (the candidate) |
| `10-common-questions.md` | Common questions, answered |
