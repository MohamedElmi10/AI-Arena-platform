# Raw Streaming Completion — Gen-AI tile

The baseline gen-AI primitive: a raw Azure OpenAI completion over the Responses
API. No agent, no tools, no retrieval, no memory. Reuses tile #1's `gpt-5-mini`
deployment directly — no Foundry agent, no new Azure resource.

## Raw completion vs agent

Tile #1 (Foundry Chat Agent) wraps the model in a hosted *agent*. This tile drops
that wrapper and calls the model directly — the same Responses API call, nothing
around it. It's the primitive every agent tile builds on.

## Sync vs async

Both modes return the same text; the difference is *when* you see it.

- **async** — streams the Responses API deltas to the browser as they arrive, so
  the answer appears progressively. This is how the runtime route serves many
  visitors at once: Node's event loop interleaves in-flight streams.
- **sync** — the server blocks for the full completion, then sends it in one
  frame, so nothing shows until it's done and the whole answer lands at once. The
  blocking call made visible.

`build.py` shows the same contrast at the Python level (`OpenAI` + `for` vs
`AsyncOpenAI` + `async for`). It's a dev-time artifact — not called by the app.

## Cost model — pay-per-call

`gpt-5-mini` is billed only on a request (~$0.25 / 1M input, ~$2 / 1M output); an
idle deployment costs nothing. The route is wrapped in `withCostSafety` (ADR-0001):
per-request token cap, daily budget cap, and a kill switch.
