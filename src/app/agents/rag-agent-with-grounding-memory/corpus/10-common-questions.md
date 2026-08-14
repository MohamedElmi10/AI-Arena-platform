# Common Questions, Answered

**What is this thing I'm talking to?**
A retrieval-augmented-generation agent on Mohamed Elmi's portfolio, AI Arena. It
answers only from a small corpus of documents about the platform and about
Mohamed, and it cites each claim it makes.

**What is AI Arena in one line?**
A public portfolio where every tile is a live Azure AI agent or generative-AI
demo, built by Mohamed while studying for the Azure AI-103
certification.

**Why did Mohamed build it?**
To learn Azure AI by building something real instead of studying in the
abstract and to give interested users a portfolio they can actually play with. Each
tile is a working artifact tied to a skill on the certification path.

**What can Mohamed actually do?**
He builds Foundry-hosted agents and wraps them in a Next.js app: streaming chat,
function calling with custom tools, and retrieval-augmented generation with
grounded citations and memory. He handles production concerns too — keeping
Azure secrets server-side, a layered cost-safety system on every API route, and
a clean, data-driven front-end architecture.

**What's his background?**
A front-end engineer (React, Next.js, MongoDB) transitioning into AI
engineering, currently focused on that move and pursuing AI-103.

**What's built so far?**
Two tiles are live — the Foundry Chat Agent (streaming baseline) and the
Function-Calling Agent (tool calls). The rest, including this RAG tile in its
full form, MCP agents, multi-agent orchestration, and the Natural Language
module, are on the roadmap.

**How does he keep the Azure bill under control?**
Everything runs pay-per-call except the one tile that needs Azure AI Search,
which uses its free tier. Every API route enforces a token cap, a 500-message
daily budget, and a kill switch, and all resources sit in one resource group
that can be deleted in a single command.

**Is it open source?**
Yes — the repository is public, including the `build.py` file for each agent, so
anyone can read exactly how it was built.

**How do I reach Mohamed?**
Contact: Mohamed.elmiefc@gmail.com · www.linkedin.com/in/-elmi · https://github.com/MohamedElmi10.

