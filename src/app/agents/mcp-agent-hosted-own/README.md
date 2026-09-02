# MCP Agent — Hosted + Own

Tile #4 in AI Arena's **Agents** module, and the sequel to the
[Function-Calling Agent](../function-calling-agent/). That tile hands the model
tools written into its own source. This one hands it tools it has never seen,
fetched over a protocol at run time, from two servers — one that GitHub runs and
one that I wrote.

## What MCP actually changes

Function calling and MCP look identical from the model's side: a list of tools
with names, descriptions and schemas. The difference is where that list comes
from.

|  | Function calling | MCP |
|---|---|---|
| Tools defined | in your code | on a server |
| Adding a tool | edit and redeploy | the server changes; you don't |
| Who runs the tool | your process | the MCP server |
| Who you have to trust | yourself | whoever runs the server |

That last row is the o
(.venv) ➜  ai-arena git:(t-012-mcp-agent-hosted-own) ✗ python3 src/app/agents/mcp-agent-hosted-own/build.py

  A. hosted — ask GitHub's server what changed in the repo
  B. own    — ask AI Arena's server what it ships
  Q. quit

> a

server: github  ·  agent: mcp-agent-aiarena-github v1
asking: What were the last three commits to MohamedElmi10/AI-Arena-platform?

  github wants to call: list_commits
  with: {"owner":"MohamedElmi10","repo":"AI-Arena-platform","perPage":3}

Here are the last three commits (most recent first):

- e93225c7bd01ad2b55024ca4dc391a3a0e7d229a — "Fix Speech Assistant guide column after T-026 (#26)"  
  Author: Mohamed Elmi — 2026-09-02T00:05:39Z  
  https://github.com/MohamedElmi10/AI-Arena-platform/commit/e93225c7bd01ad2b55024ca4dc391a3a0e7d229a

- a75a2b7360cd1214c0fb21237addf992fa4fe0b4 — "T-025: speech assistant tile (#25)"  
  Author: Mohamed Elmi — 2026-09-01T23:54:49Z  
  https://github.com/MohamedElmi10/AI-Arena-platform/commit/a75a2b7360cd1214c0fb21237addf992fa4fe0b4

- 8eff137acc43c132c4e33a169174c5bcf7c8189f — "T-026: portfolio polish (copy, links, cert, mobile layout) (#24)"  
  Author: Mohamed Elmi — 2026-08-27T17:40:14Z  
  https://github.com/MohamedElmi10/AI-Arena-platform/commit/8eff137acc43c132c4e33a169174c5bcf7c8189f

  A. hosted — ask GitHub's server what changed in the repo
  B. own    — ask AI Arena's server what it ships
  Q. quit

> b

server: own  ·  agent: mcp-agent-aiarena-own v1
asking: How many tiles on AI Arena are live, and which ones?

  own wants to call: list_tiles
  with: {"status":"live"}

There are 6 live tiles on AI Arena. They are:

- Foundry Chat Agent (module: Agents, slug: foundry-chat-agent) — streams responses token-by-token.  
- Function-Calling Agent (module: Agents, slug: function-calling-agent) — calls custom tools; demonstrates function calling and async patterns.  
- RAG Agent with Grounding & Memory (module: Agents, slug: rag-agent-with-grounding-memory) — retrieval-augmented generation with citations and persistent memory.  
- Raw Streaming Completion (module: Gen-AI, slug: raw-streaming-completion) — LLM primitive comparison (sync vs async streaming).  
- Text Analysis Agent (module: Natural Language, slug: text-analysis-agent) — sentiment, entities, key phrases, PII redaction via Azure AI Language.  
- Speech Assistant (module: Natural Language, slug: speech-assistant) — speech-to-text and text-to-speech with SSML/custom lexicon.

  A. hosted — ask GitHub's server what changed in the repo
  B. own    — ask AI Arena's server what it ships
  Q. quit

> ne worth sitting with. In the previous tile, `build.py`
ran the function itself. Here it grants **permission** and Foundry calls the
server — this code never touches GitHub. That's the trade: you stop maintaining
integrations, and you start trusting servers you didn't write.

## The two servers

Both answer "what is the state of AI Arena", and both change every time I push.
The contrast is who runs the thing that answers.

| | Server | Tools | Runs where |
|---|---|---|---|
| **A** | GitHub's MCP server | ~40 general ones — commits, issues, PRs, code search | GitHub |
| **B** | AI Arena's own server | 2, built for this page's questions | this app |

### What I got wrong here first

The tile originally promised that asking the hosted server *what shipped* would
fail, because that's the other server's subject. It doesn't fail. GitHub's server
has `search_code` and `get_file_contents`, and this repo **is** the site's source
— so it finds `data/modules.ts` and answers correctly.

Nothing enforced the split I'd described. I built the contrast on subject matter
when the real difference is where a tool lives and who runs it; the subject-matter
story was an assumption about what each server would happen to be good at.

The honest version is the better demo anyway. Ask both "how many demos are live":

- **own** — one call. Someone built a tool for that exact question.
- **hosted** — five calls. A general tool reconstructing the answer by searching
  the repository and opening source files.

Same answer, and the `🔌` lines make the difference visible. That is the actual
trade between a general-purpose integration and a purpose-built one, and it's a
sharper lesson than a limitation I would have had to manufacture with
`allowed_tools` to keep my original sentence true.

## The own server is a route, not a host

[`src/app/api/mcp/route.ts`](../../api/mcp/route.ts). The ticket planned an Azure
Function. It didn't need one.

MCP runs JSON-RPC over HTTP, and the spec lets a server answer a request with
either `text/event-stream` or a single `application/json` object — clients must
support both. Sessions are optional too (the spec says MAY). So a stateless
request/reply route is fully compliant: **no SDK, no streaming, no session
store.** About 180 lines.

The payoff is that it *is* the site. It imports `data/modules.ts` the same way
the landing page does, so there is no copy to keep in sync and no snapshot to go
stale. Deploy the site, the server is current.

Two tools:

- `list_tiles` — filter by `status` or `module`
- `get_arena_summary` — counts, totals, which Azure services are in play

It's also the one route in the app **not** wrapped in `withCostSafety`. That
middleware bounds Azure spend, and this route calls nothing — it reads an object
already in the bundle. It holds no keys either, which makes it the cheapest thing
in the repo to debug: `curl` it, and if the JSON is right, anything still broken
is a Foundry wiring problem.

```bash
curl -s -X POST https://<site>/api/mcp -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq .
```

The spec requires validating `Origin` to prevent DNS rebinding, so the route
checks it — but only rejects browser origins it doesn't know. Foundry is
server-to-server and sends no `Origin` at all.

## Auth: the token is not in this repo, and not on the agent

Connecting GitHub in the Foundry portal creates a **project connection** holding
`Authorization: Bearer <PAT>`. `MCPTool` points at it by name:

```python
MCPTool(
    server_label="github",
    server_url=GITHUB_MCP_URL,
    require_approval="always",
    project_connection_id=GITHUB_CONNECTION_ID,   # not headers={...}
)
```

Foundry attaches the header at call time. `MCPTool` *does* accept
`headers={"Authorization": ...}`, which bakes the secret into the stored agent
definition — don't.

This also explains something confusing: **the GitHub tool never appears in the
agent's YAML.** The tool lives on the agent, the secret lives in the connection,
and exporting the definition prints only the first. Seeing `web_search` alone in
the YAML while the portal clearly shows two tools is not a bug.

The PAT is fine-grained, read-only, scoped to this repo only — not a classic
token with `repo` scope, which is write access to everything, handed to a cloud
service, to read a public repo.

The own server takes no auth at all. It exposes only what the landing page
already shows.

## Approval: on here, off on the tile

`build.py` uses `require_approval="always"` on purpose. With it on, the first
response contains **no answer** — it contains a request for permission, and the
script stops and asks you:

```
  github wants to call: list_commits
  with: {"owner":"MohamedElmi10","repo":"AI-Arena-platform","perPage":3}
  approve? [y/N]
```

A server you don't control is asking to run something, with arguments you didn't
write. Deciding that once is the point — auto-approving would show nothing that
`"never"` doesn't already show. Answer **n** and watch the agent try to answer
without the tool.

The live tile uses `"never"`, because a public demo can't wait for a click nobody
makes. The asymmetry is deliberate.

**Approval is a loop, not one exchange.** One approved call returns the answer.
Two requested calls return an empty `output_text` — which looks exactly like a
dead server and sent me hunting in the wrong place for twenty minutes.
`converse()` approves until the agent stops asking, capped at five rounds,
because "approve whatever it asks" is not something to leave unbounded.

## One tool per agent version

`create_agent()` builds a separate agent per server and suffixes the name with
the server label. Give one agent both servers and the model picks which to call —
at which point the hosted/own toggle proves nothing, because you're demoing model
choice, not MCP. Without the suffix the two paths overwrite each other's versions.

## Cost

One MCP question used **~13,400 tokens** — ten to twenty times a normal chat turn,
because every tool's full schema is sent to the model on every request. GitHub's
server exposes a lot of tools.

Still cheap on `gpt-5-mini`, and still bounded by
[ADR-0001](../../../../docs/adr/0001-cost-safety-posture.md)'s `max_tokens` cap,
so no new ADR — same unit, just more of it. But it shouldn't share the chat
budget, so the runtime route gets its own key:
`withCostSafety(handler, { limit: 100, key: "mcp" })`.

Watch for **web search** being attached to a new agent by default in the portal.
That's Grounding with Bing and it bills separately. Remove it.

## The catalog trap

Most of the Foundry tool catalog is unusable here, and the tag tells you which.
**Local MCP** means the server runs on your own machine over stdio — fine for VS
Code, useless here, because the agent runs in Azure and cannot reach a laptop.
Filter to **Remote MCP**. That rules out Cosmos DB, Redis, MongoDB and Postgres
however appealing they look in the list.

## Environment

Repo-root `.env`, gitignored — never committed:

```
PROJECT_ENDPOINT=https://<resource>.services.ai.azure.com/api/projects/<project>
MODEL_ENDPOINT=gpt-5-mini
MCP_AGENT_NAME=mcp-agent-aiarena
GITHUB_MCP_URL=https://api.githubcopilot.com/mcp
GITHUB_CONNECTION_ID=GitHub
OWN_MCP_URL=https://<site>/api/mcp
```

`GITHUB_CONNECTION_ID` is the connection's **name** as shown in the Foundry portal
under Manage → Project details → Connected resources. It's case sensitive.

`GITHUB_MCP_URL` must match the connection's target exactly — including the
absence of a trailing slash.

The deployed tile needs two more, on Netlify — the names of the live agents,
printed by `build.py`'s **L** option:

```
MCP_AGENT_HOSTED_NAME=mcp-agent-aiarena-github-live
MCP_AGENT_OWN_NAME=mcp-agent-aiarena-own-live
```

`PROJECT_ENDPOINT` and the `AZURE_TENANT_ID` / `AZURE_CLIENT_ID` /
`AZURE_CLIENT_SECRET` service principal are already set for the RAG tile and are
reused here.

## The tile (Phase 2)

[`src/app/api/chat/mcp-agent-hosted-own/route.ts`](../../api/chat/mcp-agent-hosted-own/route.ts)
proxies the browser to one of two Foundry-hosted agents, chosen by the
playground's mode toggle. The agents are identical except for which MCP server
they carry — that is the whole tile, so anything else that differed between them
would muddy it.

The route sends **no conversation history**. Each question is answered from the
tools; carrying turns would let the model reuse an earlier tool result instead of
calling again, which is the one thing this tile exists to show.

An MCP call arrives on the stream as an output item, not a text delta, so the
route watches for `response.output_item.added` with `item.type === "mcp_call"` and
emits the `🔌` line the moment it appears. If the response completes and no call
ever happened, it says so — a confident answer about a repo the visitor can go
and check is worse than admitting the tool wasn't used.

The toggle itself is data, not code: `modes` in `data/modules.ts`. The shared
`Playground` renders it and posts `{ message, mode }`.

## Run it

```
source .venv/bin/activate
pip install azure-ai-projects azure-identity openai python-dotenv
az login
python3 src/app/agents/mcp-agent-hosted-own/build.py
```

Then pick **A** or **B**. Same question shape, two servers; the only thing that
changes is who answered. **L** publishes the two agents the tile calls — the same
servers with approval off, named with a `-live` suffix so they don't overwrite
the pair this script talks to.

Ask something the model cannot already know — that's the test. If it could have
guessed, the tool proved nothing. When the output says *"Answered without calling
the tool"*, the instructions are too weak, not the server.

## Redeploy

The agents are Foundry-hosted and created by `build.py`, which is a dev-time
artifact — the running app never calls it. To rebuild from nothing: connect
GitHub in the portal, set the six env vars, run the script once per path.

**After merging the PR:** point `OWN_MCP_URL` at production and run **L**. During
development it points at a Netlify deploy preview, and that URL dies with the PR —
leaving the `own` agent pinned to a host that no longer exists. The tile will
still look like it works, because the hosted half is unaffected.

## Reference

- [MCP specification — transports](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports)
- [Connect agents to MCP servers](https://learn.microsoft.com/azure/foundry/agents/how-to/tools/model-context-protocol?pivots=python)
- [MCP tool authentication](https://learn.microsoft.com/azure/foundry/agents/how-to/mcp-authentication)
- [GitHub MCP server](https://github.com/github/github-mcp-server)
