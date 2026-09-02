# T-012: MCP Agent — Hosted + Own

**Status:** open
**Blocked by:** — · **Blocks:** —
**Module:** Agents · **Slug:** `mcp-agent-hosted-own`

## Goal

Ask the agent about this project and watch it answer from a tool it didn't ship
with. Once from a server GitHub runs, once from a server I wrote.

MCP is the point: tools are discovered over a protocol, not hardcoded. The
function-calling tile hardcodes them; this one doesn't.

## Settled before starting

**Hosted path is GitHub.** Connected and tested — it returned the real last three
commits, including ones pushed an hour earlier. Chosen over the alternatives
because the account already exists and the repo is public, so auth is one
read-only token. Netlify was the flashier option; Microsoft Learn is the
zero-auth fallback if GitHub becomes a problem.

**Most of the catalog is unusable, and the tag says which.** "Local MCP" means the
server runs on your own machine over stdio — fine for VS Code, useless here,
because the agent runs in Azure and cannot reach a laptop. Filter to **Remote
MCP**. That removes Cosmos DB, Redis, MongoDB and Postgres despite how appealing
they look.

**The two paths answer the same question, not the same call.** The original
ticket demanded "true apples-to-apples". That drags my server into being a worse
copy of GitHub's and the demo becomes "two ways to read a repo". Instead:

- **Hosted** — *what changed?* Commits, issues, PRs, from GitHub's server.
- **Own** — *what shipped?* Live vs planned tiles, open tickets, read from
  `data/modules.ts` and `tickets/`.

Both answer "what is the state of AI Arena" from two different servers, and both
change every time I push. The contrast the tile teaches is where a tool comes
from and who runs it.

**Approval is on in `build.py`, off on the tile.** The portal test required
clicking approve, and feeling that round-trip once is the point — so the script
keeps `require_approval="always"` and prints every request before granting it.
A public tile can't wait for a click nobody makes, so the live agent uses
`"never"`. The asymmetry is the lesson, not an inconsistency.

**Approval is a loop, not one exchange.** One approved call returns the answer;
two requested calls return an empty `output_text` that looks exactly like a dead
server. `converse()` approves until the agent stops asking, capped at 5 rounds.
Cost me twenty minutes of suspecting the wrong thing.

**Token: fine-grained, read-only, one repo.** Not a classic token with `repo`
scope — that is write access to everything, handed to a cloud service, to read a
public repo.

## Cost

One MCP question used **~13,400 tokens** — ten to twenty times a normal chat turn,
because the model is sent every tool's schema. Still cheap on `gpt-5-mini`, and
still bounded by ADR-0001's `max_tokens` cap, so no new ADR: same unit, just more
of it.

But it shouldn't share the chat budget. Use the `{ limit, key }` parameter added
to `withCostSafety` in T-025: `{ limit: 100, key: "mcp" }`.

Web search was attached to the test agent by default. That's Grounding with Bing,
which bills separately — remove it unless the demo needs it.

## What shipped in Phase 1

**The own server is a Next.js route, not a separate host.** The ticket planned
Azure Functions. It didn't need one: the MCP spec says a server may answer a
JSON-RPC request with `application/json` rather than a stream, and sessions are
optional — so `src/app/api/mcp/route.ts` is a plain POST handler with no SDK, no
streaming and no session store. It imports `data/modules.ts` the same way the
landing page does, so there is nothing to sync and no snapshot to go stale.
Second host avoided, second deploy avoided, and the story is better.

It is the one route in the app with no keys, so it is also the one route not
wrapped in `withCostSafety` — that middleware bounds Azure spend, and this calls
nothing.

**GitHub's PAT lives in a project connection, not in the agent.** Connecting
GitHub in the portal created a connection holding `Authorization: Bearer <PAT>`;
`MCPTool` points at it by `project_connection_id` and Foundry attaches the header
at call time. `MCPTool` also takes `headers={...}`, which bakes the secret into
the stored agent definition — don't. This is also why the GitHub tool never
appears in the agent's YAML.

**One tool per agent version.** Give one agent both servers and the model picks,
which makes the hosted/own toggle prove nothing. `create_agent()` suffixes the
name with the server label so the two don't overwrite each other.

- [x] Hosted path connected and answering with real repo data.
- [x] Own MCP server — `src/app/api/mcp/route.ts`, tools `list_tiles` and
      `get_arena_summary` over `modules.ts`.
- [x] Reachable by Azure via the Netlify deploy preview; verified by `curl`
      before spending an Azure round-trip.
- [x] Connected as a custom MCP tool with no connection (unauthenticated), and
      both paths proven end to end.
- [x] `src/app/agents/mcp-agent-hosted-own/build.py` — both paths, commented.
- [ ] `README.md` — what MCP is, hosted vs own, cost, how to run each.
- [ ] After merge: rerun `build.py` with `OWN_MCP_URL` on production. Both agents
      are currently pinned to `deploy-preview-27`, which dies with the PR.

## Phase 2 — Wire

The toggle is `modes` in `data/modules.ts`, so the shared `Playground` renders it
and posts `{ message, mode }` — no bespoke component, unlike T-025. The route
picks one of two Foundry agents by name; they are identical but for the MCP
server they carry.

- [x] `app/api/chat/mcp-agent-hosted-own/route.ts` — `POST { message, mode }`,
      wrapped in `withCostSafety(handler, { limit: 100, key: "mcp" })`.
- [x] Playground toggle switches server for the same prompt.
- [x] The answer shows which server replied, and says so when no tool was called
      at all.
- [x] `guide` added to `data/modules.ts`.
- [x] No history sent. Carrying turns would let the model reuse a previous tool
      result instead of calling again — the one thing the tile must not do.
- [ ] `build.py` **L** run against production, and the two agent names set on
      Netlify.

## Phase 3 — Flip

- [x] `status: 'live'`, with a `preview`.
- [x] `tag` and `desc` match what shipped. The old desc said "Microsoft-hosted"
      (it's GitHub) and "same task, two implementations" (they answer different
      questions on purpose).
- [x] T-018 corpus pass, clearing T-024 and T-025's debt as well.
      `05-modules-and-tiles.md` was three modules and 11 tiles out of date; it now
      reads 4 modules, 15 tiles, 7 live, and records why two promised toggles
      shipped as one wiring each. Added `11-tile-text-analysis-agent.md`,
      `12-tile-speech-assistant.md`, `13-tile-mcp-agent.md`. Fixed the module
      colour list in `03-tech-stack.md` and "what's built so far" in
      `10-common-questions.md`.
- [ ] **Re-index.** The corpus files changed, so the Azure AI Search index is now
      behind them. Until it's re-indexed the RAG tile will confidently cite the
      old numbers — worse than not answering.

## Notes

- Own server must be free and self-hostable. No paid tier. It is — it is a route
  in a site that was already deployed.
- `tickets/` was dropped from the own server's scope. `modules.ts` is in the
  bundle; reading the ticket directory from a serverless function is filesystem
  work for no extra story.
- If the own half doesn't come together, rename the tile and fix the copy rather
  than shipping half a toggle. T-024 and T-025 both promised a toggle and shipped
  one wiring; this would be the third.
