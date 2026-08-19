# Tile: RAG Agent with Grounding & Memory

This tile — the one you are talking to — is the RAG Agent with Grounding &
Memory, the highest-impact tile in the Agents module. It answers questions from
a real corpus of documents about AI Arena and Mohamed, cites its sources, and
remembers the conversation across turns.

Under the hood this tile is a **Foundry-hosted agent** called `rag-agent` with
the **Azure AI Search tool** attached. The knowledge base — the Markdown files
in this corpus — was indexed once into an Azure AI Search index called
`ai-arena-rag` using the portal's **Import and vectorize data** wizard, which
chunks each document and embeds it with `text-embedding-3-small`. At query time
the agent runs that Search tool itself: it retrieves the most relevant chunks,
grounds its answer in them, and cites each source. The Next.js route retrieves
and embeds nothing — it just proxies the conversation to the hosted agent and
streams the reply back. Memory across turns is handled in the Next.js layer as a
bounded chat history (the last ~12 messages), kept short so it cannot blow the
token cap.

The agent runs on **`gpt-4.1-nano`**, not the `gpt-5-mini` the other hosted chat
tiles use. The reason is the Azure AI Search tool: it does not yet support the
gpt-5 family, so this tile uses the newest model the tool does support. Letting
the hosted agent own retrieval — rather than a hand-rolled search loop in the
app or Azure OpenAI's deprecated "On Your Data" shortcut — keeps grounding and
citations in one place and matches how the rest of AI Arena wraps Foundry
agents. Microsoft's managed replacement, Foundry IQ, is reserved for its own
separate tile.

This is the only tile that needs a provisioned service, Azure AI Search, so it
runs on Search's Free tier — the only tier with no idle charge (50 MB, one index
per subscription). The embeddings and the agent's `gpt-4.1-nano` calls are
pay-per-call, costing pennies per demo. If asked something the corpus does not
cover, the agent says so plainly instead of inventing an answer.
