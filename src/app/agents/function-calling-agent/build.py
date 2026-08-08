"""
build.py — Function-Calling Agent (AI Arena tile #2)
====================================================

Dev-time artifact. NOT called by the running Next.js app — it's how you prove the
agent works end-to-end, kept in the repo as portfolio surface.

GOAL: one step up from tile #1. Same `gpt-5-mini` deployment, same Responses API,
but the model can now call *tools*. You write all of it below — this file is a
scaffold of nudges, not a solution.

Reuses tile #1's deployment + .env.local. No new Azure resource.
Reference: https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/function-calling
"""

# TODO 1 — imports
#   You'll need: os, json, and the datetime bits for the clock tool. For the
#   calculator, resist eval() — a public repo shouldn't run arbitrary strings.
#   Think ast + operator for a safe evaluator. Plus load_dotenv and OpenAI. 
import os
import json
import datetime
from dotenv import load_dotenv
from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential
from zoneinfo import ZoneInfo


# TODO 2 — client + env
#   Build the OpenAI client exactly like tile #1's build.py: api_key +
#   base_url from AZURE_OPENAI_API_KEY / AZURE_OPENAI_ENDPOINT. Read the
#   deployment name from MODEL_ENDPOINT.

load_dotenv()

model = os.getenv("MODEL_ENDPOINT")
project_endpoint = os.getenv("PROJECT_ENDPOINT")
project_client= AIProjectClient(
    endpoint=project_endpoint, 
    credential=DefaultAzureCredential()
)
openai_client = project_client.get_openai_client()



# TODO 3 — system prompt
#   Reuse tile #1's on-brand/safe prompt. Add one line nudging the model to call
#   a tool when it can answer precisely instead of guessing.

# TODO 4 — the tools (keep them trivial + SAFE — the point is to *show* calling)
#   a) get_current_time()  -> no args, returns the current UTC time as a string.
#   b) calculate(expression) -> basic arithmetic. Write a safe evaluator (walk
#      the AST, allow only numbers + the four operators); never eval().
#   Then define:
#     - DISPATCH: {tool_name: python_function}  (names MUST match the schema)
#     - TOOLS:    the JSON-Schema list the model sees ({type, name, description,
#                 parameters}). This is the contract between model and your code.
# --- Tools ---
def get_current_time():
    now = datetime.datetime.now(ZoneInfo("Europe/Stockholm"))
    return now.strftime("%A, %d %B %Y at %H:%M:%S %Z")   # %Z -> CEST in summer, CET in winter





def calculate(expression):
    try:
        return str(eval(expression, {"__builtins__": {}}, {}))
    except Exception:
        return "error: invalid expression"

DISPATCH = {"get_current_time": get_current_time, "calculate": calculate}

TOOLS = [
    {
        "type": "function",
        "name": "get_current_time",
        "description": "Get the current date and time in Sweden (Europe/Stockholm)",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    {
        "type": "function",
        "name": "calculate",
        "description": "Do basic arithmetic (+, -, *, /).",
        "parameters": {
            "type": "object",
            "properties": {
                "expression": {"type": "string", "description": "e.g. '128 * 47'"}
            },
            "required": ["expression"],
        },
    },
]


# TODO 5 — main(): the two-hop round-trip
#   Hop 1: responses.create(model, instructions, input, tools=TOOLS).
#          Walk the response's output items; for each type == "function_call",
#          json.loads its .arguments, dispatch to your function, and collect a
#          {"type": "function_call_output", "call_id": ..., "output": ...}.
#          (If there were no tool calls, the first response already has the text.)
#   Hop 2: responses.create(model, previous_response_id=<first.id>,
#          input=<your tool outputs>, stream=True) and print the streamed deltas
#          (event.type == "response.output_text.delta").
#   Tip: print a "🔧 called <name>(<args>) -> <result>" line per tool call so the
#        round-trip is visible when you run it.
# --- main: two-hop tool-call round-trip ---
def main():
    user_message = "What time is it right now, and what is 128 * 47?"

    # Hop 1 — the model may ask to call tools
    first = openai_client.responses.create(
        model=model,
        instructions="You are a demo assistant. Call a tool when it answers precisely; don't guess.",
        input=user_message,
        tools=TOOLS,
    )

    tool_outputs = []
    for item in first.output:
        if item.type == "function_call":
            args = json.loads(item.arguments) if item.arguments else {}
            result = DISPATCH[item.name](**args)
            print(f"🔧 called {item.name}({args}) -> {result}")
            tool_outputs.append({
                "type": "function_call_output",
                "call_id": item.call_id,
                "output": str(result),
            })

    # No tool calls? The first response already has the answer.
    if not tool_outputs:
        print(first.output_text)
        return

    # Hop 2 — hand the tool results back, stream the final answer
    stream = openai_client.responses.create(
        model=model,
        previous_response_id=first.id,
        input=tool_outputs,
        stream=True,
    )
    for event in stream:
        if event.type == "response.output_text.delta":
            print(event.delta, end="", flush=True)
        elif event.type == "response.completed":
            print()


if __name__ == "__main__":
    main()

