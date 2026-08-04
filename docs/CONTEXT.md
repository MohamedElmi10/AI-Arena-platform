# AI Arena — Domain Glossary

The shared language for this project. Implementation details do not belong here.

## AI Arena
Mohamed's portfolio platform showcasing skills learned during AI-103. Primary audience: professional network and future recruiters. **Portfolio-primary**; code that stays readable and maintainable to Mohamed is a hard secondary constraint. The agents themselves are built in Azure AI Foundry; AI Arena is the UI that wraps and demos them.

## Tile
The unit of the platform. Each tile represents one showcased capability — either a single AI-103 topic or a combination of topics rolled into one demo. The landing is a wall of tiles. Clicking a tile opens its inner **playground** — an interactive surface whose shape adapts to the tile's agent type (chat, streaming console, multi-agent flow view, etc.).

## Playground
The interactive surface inside an opened tile. Not the top-level frame. This is where the recruiter actually plays with the agent.

## Module
A top-level grouping on the landing. AI Arena launches with three modules; a fourth is planned:
- **Agents** — agents built with Microsoft Agent Framework, Foundry, MCP, function calling, RAG, A2A, sequential orchestration, Foundry Workflow, Foundry IQ.
- **Gen-AI** — generative AI patterns: memory across turns, streaming, async, grounding.
- **Natural Language** — Azure Language and Speech (text analysis, speech-capable apps, translation, MCP-backed variants).
- **Insight Visual Data** *(future)* — Azure AI Vision path (Microsoft Learn `insight-visual-data`). Not part of MVP; will land as a 4th module once Mohamed studies it. The landing layout must accommodate a 4th module without redesign.

Each module has an accent color used by tiles inside it:
- Agents: **terracotta** (#c2410c / #fed7aa / #fff7ed)
- Gen-AI: **plum** (#7e22ce / #e9d5ff / #faf5ff)
- Natural Language: **moss** (#15803d / #bbf7d0 / #f0fdf4)
- Insight Visual Data: TBD when added.

Each module is one section on the landing. Tiles live inside a module.

## Tile Map
The MVP tile map, locked. Any "toggle" tile is ONE tile with a UI toggle between two implementation paths inside the Playground.

**Agents (7 tiles)**
1. Foundry Chat Agent — first Live tile. Baseline hosted chat agent, streaming, no memory, no tools. Built on `gpt-5-mini` (T-006 originally specced `gpt-4o-mini`, which retired in 2026 and can no longer be deployed).
2. Function-Calling Agent — chatbot with tool calls; async pattern.
3. RAG Agent with Grounding & Memory — retrieval + grounded citations + memory across turns.
4. MCP Agent (Hosted + Own) — **toggle**: same task via Microsoft-hosted MCP vs. own MCP server.
5. Microsoft Agent Framework Agent — same task built with MAF instead of Foundry-native.
6. Multi-Agent Orchestration — Foundry Workflow + sequential + A2A, visualised as a timeline.
7. Foundry IQ — standalone demo of Foundry IQ.

**Gen-AI (1 tile)**
8. Raw Streaming Completion — no agent framing; sync vs async streaming side-by-side.

**Natural Language (3 tiles)**
9. Text Analysis Agent — **toggle**: Azure Language via Foundry Tools vs. via Azure Language MCP server.
10. Speech Assistant — **toggle**: speech-capable gen-AI app vs. Speech MCP agent.
11. Translation — text + speech translation via Foundry Tools.

**Total: 11 tiles.** No further tiles until Insight Visual Data is added.

## Design Direction
**Editorial · Colored.** Baseline aesthetic:
- Serif display type (Fraunces) for headings/titles; Inter for body; JetBrains Mono for metadata (tags, chapter markers, counts).
- Paper-textured cream background (#faf7f2 with subtle grain).
- Each module's section gets a colored **Chapter pill** using its accent color.
- Live tiles use the module's accent for border, tint background, a pulse dot, and a hover-revealed preview snippet showing an example prompt.
- Planned tiles are dashed-border, faded, in the module's tint.
- Featured tile in each module is enlarged in a bento layout.

## Playground Layout
**Split** — locked. Guide on the left (~5/12), Chat on the right (~7/12). Above both: the Chapter pill, tile title, tagline, accent underscore, then a horizontal row of live stat cards (**Model / Tokens / Latency / Status**). Stats tick up in real time as the response streams. Below both: nothing — the layout stops at the fold.

The Live Stats bar is folded in from the Dashboard variant. Position: between the title block and the Guide+Chat grid. Behaviour: `Status` flips `idle → streaming → idle`; `Tokens` and `Latency` update on every streamed chunk.

The winning prototype file is `prototypes/playground-split.html`. The other layouts (`playground-chapter.html`, `playground-dashboard.html`) stay in the folder as primary source until the real Next.js project is set up, then move to a throwaway branch.

## Cost Safety
Azure services bill two ways, and confusing them is the fastest way to a surprise bill:
- **Pay-per-call** — Azure OpenAI models, Foundry chat completions, Speech, Translator, Azure Language. You pay only when a request happens. Free tiers exist for most (Language: 5,000 transactions/mo; Speech: 5 audio hrs/mo; Translator: 2M chars/mo).
- **Provisioned** — Azure AI Search, custom Speech endpoints, some Foundry compute-backed endpoints. You pay by the hour whether or not anyone calls them, because Azure reserves capacity. An idle app on provisioned resources still bleeds money 24/7.

AI Arena runs on pay-per-call by default. The one exception is the **RAG Agent** tile — it needs Azure AI Search. Mitigations:
- Use Azure AI Search's **free tier** (50 MB, 3 indexes) — enough for the demo.
- Or substitute a self-hosted vector store (Postgres + pgvector on Neon's free tier) to stay pay-per-call end-to-end.

**Runtime protections baked into every Next.js API route:**
- **`max_tokens` cap** on every model call (target: ≤ 400 tokens per response). Bounds per-request cost.
- **IP rate limit** — ~5 messages / minute / IP via Upstash Redis (free tier). Blocks casual token drainage.
- **Daily global budget** — counter with a hard cap. Over cap → friendly "demo capped for today, come back tomorrow" message. No model call happens.
- **Kill switch** — a `KILL_SWITCH=true` env var makes every Playground respond with "demo temporarily paused." Toggle without redeploying.

**Portfolio-level protections:**
- All AI Arena Azure resources live in **one dedicated resource group** (`rg-ai-arena`). One click deletes them all.
- **Azure Cost Management budget alerts** at $5, $10, $20 thresholds, emailed to Mohamed.
- Any tile whose backing resource is provisioned tier carries a **cost note** in its `build.py` header so future-Mohamed knows what "delete this resource group" means.

Nuclear option: `az group delete --name rg-ai-arena --yes` wipes everything. Redeployable from the repo.

## Tile State
A tile is in exactly one of two states:
- **Live** — built, wired to a working Azure agent, fully playable.
- **Planned** — greyed out on the landing. Clicking opens a small modal with the topic name and a one-line description of what this tile will demo once built. No ETAs.

"In progress" is Mohamed's internal state, not a visible one. A tile flips from Planned to Live when it ships.

## Playground Guide
The instructional panel inside every Playground. Tells the visitor exactly what to try and what to expect: "Ask about X. The agent will Y. Watch for Z." Every Live tile has one. It exists because a recruiter with 30 seconds needs a prompt and a payoff, not a blank chat box.

## Foundry-hosted Agent
An agent that lives inside Azure AI Foundry as a hosted endpoint. Mohamed builds and configures these agents in Python (or the Foundry UI); at runtime, AI Arena's Next.js API routes call the Foundry endpoint by URL. Python is a **dev-time artifact**, not a runtime dependency. The `build.py` (or equivalent) file for each agent lives in the repo as portfolio surface — recruiters can read it.

## Runtime Path
The path a user's message takes when they interact with a Playground: browser → Next.js API route → Foundry-hosted Agent endpoint → back. Azure credentials never touch the browser. For tiles that aren't wrapping a Foundry-hosted agent (e.g. a raw streaming completion demo), the Next.js API route calls Azure OpenAI directly via the Node.js `openai` package instead.
