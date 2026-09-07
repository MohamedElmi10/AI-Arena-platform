# Multi-Agent Orchestration

The "wow" tile in AI Arena's **Agents** module: three specialist agents
collaborating on one task in a fixed sequential chain, with the run rendered as
a timeline.

## What it is

A **Foundry Workflow** (`trip-planner`) that chains three hosted agents in a
fixed order. You type a trip request; each agent transforms the previous one's
output and hands off to the next:

```
Start → Trip-Researcher → Trip-Itinerary-Planner → Trip-Budget-Tips
```

| Agent | Input | Output |
| --- | --- | --- |
| **Trip-Researcher** | a trip request (destination, days, interests, budget) | attractions grouped by type |
| **Trip-Itinerary-Planner** | those attractions | a day-by-day itinerary |
| **Trip-Budget-Tips** | that itinerary | cost estimate (EUR) + local tips |

This is **sequential + A2A** (agent-to-agent): the order is fixed by the graph,
and each agent's output *is* the next agent's input.

### How the handoff works

Each node reads the previous node's output through an **explicit workflow
variable**, not the shared "last message":

```
Researcher  input =System.LastMessage    → output Local.ResearcherOutput
Planner     input =Local.ResearcherOutput → output Local.PlannerOutput
Budget      input =Local.PlannerOutput    → output Local.BudgetOutput
```

`autoSend: true` on every node appends that node's answer to the conversation so
the next node can read it. The full graph is in [`workflow.yaml`](./workflow.yaml).

Each agent also carries a `Trip: <dest>, <days>, <interests>, <budget>` header
line forward — in a sequential chain the last node never sees the original user
input, so without the header the budget agent would lose the budget level.

> **Model note:** the agents use a **non-reasoning** chat deployment (`gpt-4o`),
> deliberately *not* the shared `gpt-5-mini` the other tiles use. A reasoning
> model emits a separate reasoning item that becomes the "last message", which
> broke the handoff (the next agent saw an empty/errored message and refused).
> Explicit `Local.*` variables plus a non-reasoning model is what makes the chain
> reliable.

`build.py` in this folder is the dev-time script. It does two jobs: **creates**
the three agents (so they're reproducible from the repo) and **runs** the
workflow, streaming each `workflow_action` step. The running Next.js app never
calls `build.py` — at runtime an API route calls the workflow server-side, so the
key never reaches the browser.

> **Runtime note:** built on Foundry Workflows (classic), which Microsoft retires
> **2026-12-01**. Decision: ship on the current API now; migrate to Microsoft
> Agent Framework only when forced (retirement, or the next update) — not
> preemptively.

## Cost model — one message is several model calls

A single run invokes the model **once per agent** — three calls minimum — so it
costs roughly 3× a single-agent tile. Measured:

- Full run (e.g. 4 days in Lisbon): **~3,900–4,800 tokens**.
- Refused run (bad input, e.g. `hello`): **~600 tokens** — *not free*: all three
  agents still fire, each just returns its guard message.

`gpt-4o` is billed per call with no idle charge. Confirm current pricing on the
[Azure OpenAI pricing page](https://azure.microsoft.com/pricing/details/cognitive-services/openai-service/).

Guardrails per [ADR-0001](../../../../docs/adr/0001-cost-safety-posture.md): the
Next.js route wraps the handler in `withCostSafety(...)`, capping tokens,
rate-limiting by IP, and honouring the daily budget + kill switch. A multi-agent
run spends more per message than any other tile — watch the cap.

## Environment

`build.py` reads three values from `.env.local` at the repo root (gitignored —
**never committed**; the repo is public):

```
PROJECT_ENDPOINT=https://<your-resource>.services.ai.azure.com/api/projects/<your-project>
MULTI_AGENT_MODEL=gpt-4o
MULTI_AGENT_WORKFLOW=trip-planner
```

`MULTI_AGENT_MODEL` must be a non-reasoning deployment name (see the model note).
Auth is via `DefaultAzureCredential` (`az login`), not an API key.

## Run it

```
python -m venv .venv && source .venv/bin/activate
pip install azure-ai-projects azure-identity openai python-dotenv
az login
python src/app/agents/multi-agent-orchestration/build.py
```

It creates/versions the three agents, then runs the workflow once and streams the
steps + handoffs to the console.

## How to redeploy (if the Foundry project is deleted)

Everything here is reproducible from the repo:

1. Create the Foundry project (any region with `gpt-4o`; Sweden Central works).
2. Deploy `gpt-4o`; name the deployment `gpt-4o`.
3. Fill in `.env.local` (see above).
4. Run `build.py` — this recreates the three agents from their instructions.
5. Recreate the workflow: in the portal, **Build → Workflows → new workflow →
   YAML tab**, paste [`workflow.yaml`](./workflow.yaml), and save it as
   `trip-planner`.
6. Re-run `build.py` to confirm the full chain works end-to-end.

## Reference

[Foundry Agent Service — multi-agent workflows](https://learn.microsoft.com/azure/ai-foundry/agents/concepts/workflow)
