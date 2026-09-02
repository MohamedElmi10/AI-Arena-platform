# RAG Corpus

The knowledge base for the **RAG Agent with Grounding & Memory** tile. Every
`.md` file in this folder is a source the agent can retrieve from and cite.

## How it's used

The files in this folder were indexed once into the `ai-arena-rag` index in
Azure AI Search (Free tier) using the portal's **Import and vectorize data**
wizard, which chunks each document and embeds it with `text-embedding-3-small`.
At query time the Foundry-hosted `rag-agent` — running `gpt-4.1-nano` with the
Azure AI Search tool attached — retrieves the top matches, answers **only** from
them, and cites each source. `build.py` next to this corpus is a dev-time chat
client for that agent, not an ingest script; the running app never executes it.
When the corpus changes, re-index so the search index matches these files (via
the portal wizard, or the `build.py --ingest` loop once it exists — see T-018).

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
| `11-tile-text-analysis-agent.md` | Tile: Text Analysis Agent |
| `12-tile-speech-assistant.md` | Tile: Speech Assistant |
| `13-tile-mcp-agent.md` | Tile: MCP Agent (Hosted + Own) |
