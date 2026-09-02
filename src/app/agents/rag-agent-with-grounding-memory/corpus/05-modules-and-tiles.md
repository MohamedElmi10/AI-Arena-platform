# Modules and Tiles

AI Arena's landing wall is organised into **modules**, each a top-level grouping
with its own accent color. There are four, holding **15 tiles** in total. As of
this writing **7 are Live** and 8 are Planned.

**Agents** (terracotta) is the largest module, with seven tiles. Four are Live:
the Foundry Chat Agent (the baseline hosted chat agent, streaming, no tools or
memory); the Function-Calling Agent (a chat agent that calls custom tools and
builds its answer from the result); the RAG Agent with Grounding & Memory
(retrieval over this corpus, with citations and memory across turns); and the MCP
Agent (Hosted + Own), which answers questions about this project from tools
discovered over the Model Context Protocol — switchable between GitHub's MCP
server and a server Mohamed wrote inside this app. Three are Planned: the
Microsoft Agent Framework Agent (the same task built with MAF instead of
Foundry-native), Multi-Agent Orchestration (a Foundry Workflow with A2A handoffs
on a timeline), and a standalone Foundry IQ demo.

**Gen-AI** (plum) covers generative-AI primitives. Its one tile, Raw Streaming
Completion, is Live: no agent framing, just the model, shown as a side-by-side
sync-versus-async streaming comparison.

**Natural Language** (moss) covers Azure Language and Speech across three tiles.
Two are Live: the Text Analysis Agent (sentiment, entities, key phrases and PII
redaction, with Azure AI Language run as a tool inside a Foundry-hosted agent),
and the Speech Assistant (speech to text, text to speech with SSML and a custom
pronunciation lexicon, built directly on the Speech SDK rather than an agent).
Translation is Planned.

**Insight Visual Data** (steel blue) covers Azure AI Vision across four Planned
tiles: Vision Chat (multimodal chat over images), Generative Media (image and
video generation), Content Understanding, and Document Intelligence.

The Text Analysis Agent and the Speech Assistant were both originally specified
as toggles between a direct service call and an MCP variant. In each case the MCP
half needed tiers or infrastructure that did not justify the cost, so each
shipped as one wiring and the tile copy was corrected rather than left promising
a switch that isn't there. The MCP Agent is where a real two-server toggle did
ship.
