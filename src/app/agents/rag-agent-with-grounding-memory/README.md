# RAG Agent with Grounding & Memory

The highest-impact tile in AI Arena's **Agents** module: retrieval-augmented
generation that answers from a real corpus, cites its sources, and remembers the
conversation.

## What it is

A small corpus (docs about AI Arena / Mohamed) is embedded into an **Azure AI
Search** index. Each message follows the manual RAG loop:

1. Embed the question (`text-embedding-3-small`).
2. Hybrid search the index (vector + keyword) for the most relevant chunks.
3. Feed those chunks to **gpt-5-mini** with an instruction to answer *only* from
   them and cite each claim as `[n]`.
4. Return the grounded answer + the sources actually used.

Memory across turns is handled in the Next.js layer (bounded chat history so it
can't blow the token cap).

`build.py` in this folder creates the index and ingests the corpus, and documents
the retrieval pattern the API route mirrors.

## Why manual retrieval (not "On Your Data")

Azure OpenAI **"On Your Data"** (the `data_sources` shortcut) is **deprecated**
(retires **2026-10-14**) and does **not** support gpt-5-mini — only older GPT-4o
versions. Manual retrieval works with gpt-5-mini, is the durable/canonical RAG
pattern, and keeps us on the stack we already have. (Microsoft's managed
replacement, **Foundry IQ**, is reserved for its own tile, T-015.)

## Cost model — the one tile with a trap

- **Azure AI Search — Free tier only.** $0, no hourly/idle charge (50 MB, one
  free service per subscription). **Never** provision Basic/Standard — those bill
  by the hour whether or not anyone uses them. This is the cost trap ADR-0001
  flagged; the Free tier removes it.
- Embeddings + gpt-5-mini — pay-per-call, pennies per demo.
- Everything lives in `rg-ai-arena`; `az group delete --name rg-ai-arena --yes`
  wipes it, including the Search service.

## Environment (`.env.local`, never committed)

```
AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com/openai/v1/
AZURE_OPENAI_API_KEY=<key>
MODEL_ENDPOINT=gpt-5-mini
EMBED_DEPLOYMENT=text-embedding-3-small
AZURE_SEARCH_ENDPOINT=https://<search-service>.search.windows.net
AZURE_SEARCH_KEY=<admin-key>
AZURE_SEARCH_INDEX=ai-arena-rag
```

## Run / redeploy

```
pip install openai azure-search-documents python-dotenv
python src/app/agents/rag-agent-with-grounding-memory/build.py --ingest   # create index + upload corpus
python src/app/agents/rag-agent-with-grounding-memory/build.py            # demo a grounded, cited answer
```

## Clean delete

The index lives in the Free-tier Search service in `rg-ai-arena`. Deleting the
resource group removes it; re-running `build.py --ingest` recreates it from the
corpus in this repo — nothing to back up.
