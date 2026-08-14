# Tile: RAG Agent with Grounding & Memory

This tile — the one you are talking to — is the RAG Agent with Grounding &
Memory, the highest-impact tile in the Agents module. It answers questions from
a real corpus of documents about AI Arena and Mohamed, cites its sources, and
remembers the conversation across turns.

Each message follows a manual retrieval-augmented-generation loop. The question
is embedded with `text-embedding-3-small`. The embedding is used to run a hybrid
(vector plus keyword) search over an Azure AI Search index called
`ai-arena-rag`, returning the most relevant chunks. Those chunks are handed to
`gpt-5-mini` with an instruction to answer *only* from them and to cite each
claim as `[n]`. The agent returns the grounded answer along with the list of
sources it actually used. Memory across turns is handled in the Next.js layer as
a bounded chat history, kept short so it cannot blow the token cap.

The design deliberately uses **manual retrieval** rather than Azure OpenAI's "On
Your Data" shortcut. "On Your Data" is deprecated (it retires on 2026-10-14) and
does not support `gpt-5-mini` — only older GPT-4o versions. Manual retrieval
works with `gpt-5-mini`, is the durable and canonical RAG pattern, and keeps the
project on the stack it already uses. Microsoft's managed replacement, Foundry
IQ, is reserved for its own separate tile.

This is the only tile that needs a provisioned service, Azure AI Search, so it
runs on Search's Free tier — the only tier with no idle charge (50 MB, one index
per subscription). Embeddings and `gpt-5-mini` are pay-per-call, costing pennies
per demo. If asked something the corpus does not cover, the agent says so plainly
instead of inventing an answer.
