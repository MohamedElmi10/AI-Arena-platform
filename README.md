# AI Arena

A working portfolio of Azure AI skills — every tile is a live agent or generative-AI demo built while studying for AI-103.

**Live at:** *(set after T-009)*

## Modules

- **Agents** — Foundry-hosted agents, Microsoft Agent Framework, MCP (hosted + own), function calling, RAG, A2A, Foundry Workflow, Foundry IQ, sequential multi-agent orchestration.
- **Gen-AI** — raw streaming completion (sync vs. async).
- **Natural Language** — Azure Language, Speech, Translation.
- **Insight Visual Data** *(planned)* — Azure AI Vision path.

## How this repo is built

- **Public from day 1.** The repo is part of the portfolio.
- **One ticket at a time.** See [`tickets/`](tickets/) for the roadmap. Each ticket is thin enough for one focused session; each closes with a single commit.
- **Beautiful over clever.** Readability wins. See [`CLAUDE.md`](CLAUDE.md) and [`docs/CONTEXT.md`](docs/CONTEXT.md).
- **Cost-safe by design.** See [`docs/adr/0001-cost-safety-posture.md`](docs/adr/0001-cost-safety-posture.md).

## Stack

Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Azure AI Foundry · Netlify.

## Docs

- Domain glossary → [`docs/CONTEXT.md`](docs/CONTEXT.md)
- Architectural decisions → [`docs/adr/`](docs/adr/)
- Landing / playground prototypes → [`docs/prototypes/`](docs/prototypes/)

## License

MIT.
