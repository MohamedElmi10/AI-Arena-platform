# Function-Calling Agent

Tile #2 in AI Arena's **Agents** module. The first step up from the baseline
[Foundry Chat Agent](../foundry-chat-agent/README.md): this one can call **tools**.

## What it is

The same `gpt-5-mini` deployment and the same Responses API as tile #1 — but the
model is given a set of **tool schemas** and can choose to call one instead of
guessing. When it does, it hands control back to us mid-turn: we run the tool,
return the result, and the model finishes with a real answer.

Two deliberately trivial, safe tools (the point is to *show* function calling,
not to build real integrations):

- `get_current_time()` — returns the current time in Sweden (Europe/Stockholm,
  which auto-switches CET/CEST for winter/summer). A no-argument tool.
- `calculate(expression)` — evaluates basic arithmetic. An argument-bearing tool
  that only allows numbers and math operators, so a prompt can't run real code.

## The tool-call round-trip (the "async" pattern)

The answer arrives in **two hops**, not one:

1. We send the user's message + the tool schemas.
2. The model replies with a `function_call` (name + JSON args) — "run this for me".
3. Our code runs the function and captures the result.
4. We send the result back (a `function_call_output`, referencing the first
   response via `previous_response_id`), and the model streams the final answer.

That mid-turn hand-off is what "async" means here — the model pauses, we do work,
the model resumes. It's the pattern every tool-using agent is built on.

## Cost model — pay-per-call, no idle cost, no new resource

Reuses tile #1's `gpt-5-mini` deployment. Tool calling adds only a few tokens per
hop (the schema + the tool result). Billed only when a request happens; nothing
new is provisioned, so there's nothing extra to delete later. Guardrails per
[ADR-0001](../../../../docs/adr/0001-cost-safety-posture.md) still apply.

## Environment

Same three values as tile #1 (repo-root `.env.local`, gitignored — never commit):

```
AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com/openai/v1/
AZURE_OPENAI_API_KEY=<your-key>
MODEL_ENDPOINT=gpt-5-mini
```

## Run it

```
source .venv/bin/activate        # reuse the venv from tile #1
pip install openai python-dotenv # (already installed if you ran tile #1)
python src/app/agents/function-calling-agent/build.py
```

Expected output: a `🔧 model called ...` line for each tool the model invoked,
then a streamed final answer that uses the tool results (the Swedish time + `6016`).
That proves the round-trip works end-to-end.

## Reference

- [Azure OpenAI Responses API — function calling](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/function-calling)
