# Tile: Foundry Chat Agent

The Foundry Chat Agent is AI Arena's baseline tile and the first one to go Live.
It is a simple Foundry-hosted chat agent that streams its responses
token-by-token. It has no memory across turns, no tools, and no retrieval — just
a hosted chat agent behind the Foundry Responses API. Every other tile in the
Agents module is a variation on this pattern, which is why it exists first.

It runs on the `gpt-5-mini` deployment. A visitor might ask it for an elevator
pitch for AI Arena, or to explain the difference between an agent and a chatbot,
or what Azure AI Foundry is in one sentence. The response streams in
character-by-character in a neutral tone tuned for portfolio demos. There are no
tool calls and no citations — those capabilities live in other tiles.

Under the hood, Azure AI Foundry hosts the agent; the Next.js API route acts as
a thin proxy so the Azure keys stay server-side; and streaming is delivered via
the Responses API, using the `response.output_text.delta` events to push each
chunk to the browser as it arrives.
