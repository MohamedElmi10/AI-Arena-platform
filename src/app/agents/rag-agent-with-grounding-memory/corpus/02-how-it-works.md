# How AI Arena Works

When a visitor sends a message in a playground, it takes a fixed path: browser →
Next.js API route → the agent's Azure endpoint → back to the browser. The
browser never talks to Azure directly, and Azure credentials never reach the
browser. All server logic lives in Next.js route handlers under `src/app/api/`.

Most tiles wrap a **Foundry-hosted agent** — an agent that lives inside Azure AI
Foundry as a hosted endpoint. Mohamed builds and configures each agent in Python
(or the Foundry UI); at runtime the Next.js route just calls the Foundry
endpoint by URL and proxies the response. For a few tiles that aren't wrapping a
hosted agent — such as the raw streaming-completion demo — the route calls Azure
OpenAI directly through the Node.js `openai` package instead.

Every agent has a `build.py` file that documents how it was created in Foundry.
That Python is a **dev-time artifact, not a runtime dependency**: the running
app never executes it. It lives in the repo on purpose, as portfolio surface —
anyone can read exactly how each agent was built.

The user interface is **data-driven**. Every module and tile is defined in one
file, `src/data/modules.ts`. Flipping a tile from Planned to Live is a data
edit, not a code change — you change its status, add its example prompt and
playground guide, and the landing wall updates itself.
