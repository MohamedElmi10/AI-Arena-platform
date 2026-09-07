"""
build.py — Multi-Agent Orchestration (AI Arena · Agents module)
================================================================

Dev-time artifact. NOT called by the running Next.js app — the app calls the
Foundry-hosted workflow by name. This file does both jobs so the tile is
reproducible from the repo: it CREATES the three agents and RUNS the workflow.

The tile: three specialists in a fixed sequential chain (A2A handoff) —

    Start -> Trip-Researcher -> Trip-Itinerary-Planner -> Trip-Budget-Tips

Each agent reads the previous agent's output via explicit Local.* variables
(NOT System.LastMessage — a reasoning model breaks LastMessage, so use gpt-4o).
The graph itself (node order + variable wiring) is authored in the Foundry
portal and exported to workflow.yaml beside this file.

Runtime: Foundry Workflows (classic, retiring 2026-12-01). Migrate to Agent
Framework only when forced — not preemptively (see T-014 notes).

COST (ADR-0001): one message = 3+ model calls. ~4k tokens for a full run,
~600 for a refused run — a garbage input is not free.

ENV (.env at repo root — gitignored; repo is public):
  PROJECT_ENDPOINT      Foundry project endpoint
  MULTI_AGENT_MODEL     non-reasoning deployment, e.g. gpt-4o
  MULTI_AGENT_WORKFLOW  workflow name, e.g. trip-planner

RUN:
  pip install azure-ai-projects azure-identity openai python-dotenv
  az login
  python src/app/agents/multi-agent-orchestration/build.py
"""

import os
from dotenv import load_dotenv
from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient
from azure.ai.projects.models import PromptAgentDefinition, ResponseStreamEventType

load_dotenv()

# One client: creates/versions the agents, and calls the workflow.
project_client = AIProjectClient(
    endpoint=os.environ.get("PROJECT_ENDPOINT"),
    credential=DefaultAzureCredential(),
)
openai_client = project_client.get_openai_client()

MODEL = os.environ.get("MULTI_AGENT_MODEL")               # non-reasoning, e.g. gpt-4o
WORKFLOW = os.environ.get("MULTI_AGENT_WORKFLOW")         # e.g. trip-planner


# The three specialists. Each: role -> what it outputs -> output-only -> guard.
# "Output only" is load-bearing: a node's output becomes the next node's whole
# input, so any preamble poisons the handoff. Each carries the "Trip:" header
# forward so the budget agent still sees the budget level the user typed.
AGENTS = {
    "Trip-Researcher": (
        "You are a travel researcher. You receive a trip request "
        "(destination, number of days, interests, budget level).\n\n"
        "Start your output with one line: "
        "Trip: <destination>, <days> days, <interests>, <budget> budget\n\n"
        "Then list 6-10 attractions/activities matching the interests, grouped "
        "by type (e.g. Food, History), one line each with a short note.\n\n"
        "Recommend well-known, stable attractions. Do not invent specific "
        "prices, opening hours, or restaurant names — keep costs general and "
        "clearly approximate.\n\n"
        "Output only the trip line and the attractions list. No itinerary, no "
        "costs — those are later agents' jobs.\n\n"
        "If the input is not a trip request, reply only: Please provide a trip "
        "request: destination, days, interests, and budget level."
    ),
    "Trip-Itinerary-Planner": (
        "You are a trip itinerary planner. You receive a trip line and a list "
        "of attractions.\n\n"
        "Keep the Trip: line at the top unchanged.\n\n"
        "Then build a realistic day-by-day plan (Day 1, Day 2, ...) for the "
        "number of days given — group nearby attractions per day, split into "
        "morning / afternoon / evening. Don't overpack a day.\n\n"
        "Output only the trip line and the day-by-day itinerary. No costs — "
        "that's the next agent's job.\n\n"
        "If the input is not attractions with a trip line, reply only: Please "
        "provide researched attractions to build an itinerary from."
    ),
    "Trip-Budget-Tips": (
        "You are a travel budget and local-tips advisor. You receive a trip "
        "line and a day-by-day itinerary.\n\n"
        "Using the budget level in the trip line, add:\n"
        "- A rough cost estimate in euros (food, attractions, local transport, "
        "and a total range). Label everything as approximate.\n"
        "- 3-5 practical local tips (transport passes, timing, reservations, "
        "etiquette).\n\n"
        "Output: the itinerary, then an Estimated budget section, then a Local "
        "tips section.\n\n"
        "If the input is not a trip itinerary, reply only: Please provide a "
        "trip itinerary to estimate budget and tips for."
    ),
}


def create_agents():
    """Job 1 — write the agents into Foundry so they're reproducible from code."""
    for name, instructions in AGENTS.items():
        agent = project_client.agents.create_version(
            agent_name=name,
            definition=PromptAgentDefinition(model=MODEL, instructions=instructions),
        )
        print(f"  {name:<24} v{agent.version}")


def run_workflow(user_input):
    """Job 2 — call the workflow and stream the run.

    A `workflow_action` item = one agent step; action_id + previous_action_id are
    the handoff. That is the per-step data the tile's timeline (Phase 2) renders.
    """
    conversation = openai_client.conversations.create()
    stream = openai_client.responses.create(
        conversation=conversation.id,
        extra_body={"agent_reference": {"name": WORKFLOW, "type": "agent_reference"}},
        input=user_input,
        stream=True,
    )
    for event in stream:
        if (event.type == ResponseStreamEventType.RESPONSE_OUTPUT_ITEM_ADDED
                and event.item.type == "workflow_action"):
            print(f"\n\n── {event.item.action_id}  (after: {event.item.previous_action_id}) ──")
        elif event.type == ResponseStreamEventType.RESPONSE_OUTPUT_TEXT_DELTA:
            print(event.delta, end="", flush=True)
    print()
    openai_client.conversations.delete(conversation_id=conversation.id)


def main():
    print("Creating agents...")
    create_agents()
    print("\nRunning workflow...\n")
    run_workflow("4 days in Lisbon, love food + history, mid budget")


if __name__ == "__main__":
    main()
