# Modules and Tiles

AI Arena's landing wall is organised into **modules**, each a top-level grouping
with its own accent color. The MVP launches with three, and a fourth is planned.

**Agents** (terracotta) is the largest module: agents built with the Microsoft
Agent Framework, Foundry, MCP, function calling, RAG, agent-to-agent handoffs,
and sequential orchestration. It holds seven tiles: the Foundry Chat Agent (the
baseline hosted chat agent, and the first Live tile); the Function-Calling Agent
(a chatbot that calls custom tools, using an async pattern); the RAG Agent with
Grounding & Memory (retrieval plus grounded citations plus memory across turns);
the MCP Agent (a toggle between a Microsoft-hosted MCP server and Mohamed's own);
the Microsoft Agent Framework Agent (the same task built with MAF instead of
Foundry-native); Multi-Agent Orchestration (a Foundry Workflow with A2A handoffs
on a timeline); and a standalone Foundry IQ demo.

**Gen-AI** (plum) covers generative-AI patterns — streaming, async, grounding,
and memory across turns. Its one tile is Raw Streaming Completion: no agent
framing, just the model, shown as a side-by-side sync-versus-async streaming
comparison.

**Natural Language** (moss) covers Azure Language and Speech across three tiles:
a Text Analysis Agent (sentiment, entities, key phrases — a toggle between Azure
Language via Foundry Tools and via the Azure Language MCP server); a Speech
Assistant (a speech-capable app plus a Speech MCP agent); and Translation (text
and speech translation via Foundry Tools).

That is **11 tiles total** at MVP. A fourth module, **Insight Visual Data**
(Azure AI Vision), is planned but not part of the MVP; the landing is built to
absorb it without a redesign. As of this writing, two tiles are Live — the
Foundry Chat Agent and the Function-Calling Agent — and the rest are Planned.
