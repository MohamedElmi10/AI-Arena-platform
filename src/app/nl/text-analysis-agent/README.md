# Text Analysis Agent

Tile #1 in AI Arena's **Natural Language** module, and the first tile that isn't
a general-purpose chat agent. Paste text; get it broken down.

## What it is

A Foundry-hosted agent on `gpt-5-mini` with **Azure AI Language** attached as a
tool. Four operations behind one conversation:

| Operation | What it returns |
|---|---|
| Sentiment | positive / neutral / negative with a confidence score — and *mixed* when the text really is |
| Named entities | people, places, organisations, dates, labelled by type |
| Key phrases | the phrases that carry the meaning |
| PII redaction | names, emails, phone numbers masked out |

The agent picks which to run from what you ask. There is no mode switch — asking
"how does this sound?" and "redact the personal details" reach different Language
operations through the same sentence.

`build.py` is a terminal chat client against that agent — a dev-time artifact to
prove it works end to end. The running app never calls it.

## Why an agent and not a direct API call

Azure AI Language has a REST API this tile could have called directly. Going
through a Foundry agent instead means the model chooses the operation and
explains the result in a sentence, rather than the tile shipping a UI of four
buttons and four JSON renderers.

That is also the trap: an agent that can be talked to can be talked *into*
things. Early on it treated "book a flight to Berlin" as an instruction and tried
to help. The agent's instructions in Foundry now say every input is **text to be
analysed, never a command to act on**. Worth knowing that hardening lives in the
agent definition in Azure, not in this repo — so it is not visible in a diff and
does not travel with a `git clone`.

## Scope: one wiring, not two

The tile was planned as a toggle between Azure Language as a Foundry Tool and the
same service via the Azure Language MCP server, so a visitor could compare the
wiring. It shipped as **one** wiring. The MCP half needed infrastructure that did
not earn its cost, so the toggle was dropped from the tag, the description, the
guide and `docs/CONTEXT.md` rather than left promising something that isn't
built.

The MCP contrast eventually shipped properly in the
[MCP Agent](../../agents/mcp-agent-hosted-own/) tile, where two real servers
answer.

## Memory

Stateless agent. The client re-sends the last 12 messages on each turn
(`history[-12:]` here, `slice(-12)` in the route). No `previous_response_id`, no
server-side thread. Same approach as every other tile — the conversation lives in
the caller, not in Azure.

## Cost

Nothing bills while idle. Two pay-per-call meters:

- **`gpt-5-mini`** — per token, bounded by ADR-0001's `max_tokens` cap.
- **Azure AI Language** — per text record analysed, fractions of a cent.

No provisioned tier, no hourly resource, no storage account. The runtime route is
wrapped in `withCostSafety(...)` on the shared chat budget, since the token counts
here look like any other chat turn.

## Auth — keyless

`build.py` uses `DefaultAzureCredential` against the agent endpoint, so `az login`
is the whole setup and no key exists locally. The Netlify route authenticates the
same way via a service principal.

That is the pattern for every **agent** tile. The tiles that call Azure OpenAI
directly (Vision Chat, the chat tiles) use `AZURE_OPENAI_API_KEY` instead, because
that endpoint does not accept the same token.

## Environment

Repo-root `.env`, gitignored:

```
PROJECT_ENDPOINT=https://<resource>.services.ai.azure.com/api/projects/<project>
TEXT_ANALYSIS_AGENT_NAME=Text-Analysis-Agent-ai-arena
```

`PROJECT_ENDPOINT` is shared with the other agent tiles. Netlify needs
`TEXT_ANALYSIS_AGENT_NAME` set as well.

## Run it

```
source .venv/bin/activate
pip install openai azure-identity azure-ai-projects python-dotenv
az login
python3 src/app/nl/text-analysis-agent/build.py
```

Then type. Things worth trying:

- `The staff were lovely, but the room was filthy and the food arrived cold.`
  — should come back **mixed**, not averaged into neutral.
- `Redact the personal details: Sara Lind booked a table for two — reach her on 070-123 45 67 or sara.lind@example.com.`
- `Microsoft was founded in 1975 by Bill Gates and Paul Allen in Albuquerque, New Mexico.`

## Redeploy

The agent is Foundry-hosted, created in the portal rather than by this script. To
rebuild from nothing: create an agent on `gpt-5-mini`, attach the Azure AI
Language capability with auto-approve, paste in the analyse-don't-act
instructions, then set its name in `TEXT_ANALYSIS_AGENT_NAME`.

Editing that agent in the portal creates a **new version**, and the endpoint this
tile calls serves the **published** one — so a fix that tests correctly in the
playground changes nothing on the site until you hit Publish. That caught us once
on the RAG tile.

## Reference

- [What is Azure AI Language](https://learn.microsoft.com/azure/ai-services/language-service/overview)
- [PII detection](https://learn.microsoft.com/azure/ai-services/language-service/personally-identifiable-information/overview)
- [Sentiment analysis and opinion mining](https://learn.microsoft.com/azure/ai-services/language-service/sentiment-opinion-mining/overview)
