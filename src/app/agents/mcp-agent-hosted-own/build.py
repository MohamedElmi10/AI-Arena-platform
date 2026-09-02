"""
build.py — MCP Agent: Hosted + Own (AI Arena · Agents module)

Dev-time proof. Not run by the Next.js app.

The point of the tile: the agent calls tools it did not ship with, discovered at
run time over the MCP protocol. Two servers answer questions about this same
project, and the only thing that changes between them is who runs the server.

  A. hosted — GitHub's MCP server:   "what changed in the repo?"
  B. own    — AI Arena's own server: "what does the site actually ship?"

Path B's server is src/app/api/mcp/route.ts — a normal route in this very app,
so it imports data/modules.ts directly. Nothing to sync, never stale.

ENV (.env at the repo root, gitignored)
  PROJECT_ENDPOINT      the Foundry project
  MODEL_ENDPOINT        deployment name, e.g. gpt-5-mini
  MCP_AGENT_NAME        base name; each path gets its own suffixed agent
  GITHUB_MCP_URL        https://api.githubcopilot.com/mcp
  GITHUB_CONNECTION_ID  the project connection holding the GitHub PAT
  OWN_MCP_URL           https://<your-site>/api/mcp

RUN
  pip install azure-ai-projects azure-identity openai python-dotenv
  az login
  python src/app/agents/mcp-agent-hosted-own/build.py
"""

import os

import dotenv
from azure.ai.projects import AIProjectClient
from azure.ai.projects.models import MCPTool, PromptAgentDefinition
from azure.identity import DefaultAzureCredential
from openai.types.responses.response_input_param import (
    McpApprovalResponse,
    ResponseInputParam,
)

dotenv.load_dotenv()

# Two clients from one credential: the Foundry client creates and versions
# agents, the OpenAI-shaped client is what you actually talk to them through.
project_client = AIProjectClient(
    endpoint=os.getenv("PROJECT_ENDPOINT"),
    credential=DefaultAzureCredential(),
)
openai_client = project_client.get_openai_client()


# ── the two servers ──────────────────────────────────────────────────────────
# An MCPTool is a declaration, not a connection: a label, a URL, and whether
# calls need a human to approve them. Nothing is contacted until the agent runs.

# GitHub's PAT is not in this file. Connecting GitHub in the Foundry portal
# created a project connection holding `Authorization: Bearer <PAT>`, and this
# points at it by name — Foundry attaches the header at call time. That is also
# why the GitHub tool never appears in the agent's YAML: the tool lives on the
# agent, the secret lives in the connection.
mcp_tool_hosted = MCPTool(
    server_label="github",
    server_url=os.getenv("GITHUB_MCP_URL"),
    require_approval="always",
    project_connection_id=os.getenv("GITHUB_CONNECTION_ID"),
)

# No connection here — the route is public and read-only, exposing only what the
# landing page already shows.
mcp_tool_own = MCPTool(
    server_label="own",
    server_url=os.getenv("OWN_MCP_URL"),
    require_approval="always",
)

# The tile's own agents. Identical but for require_approval — a public demo
# cannot wait for a click nobody makes. Written out rather than cloned so the
# one line that differs is the one you read.
mcp_tool_hosted_live = MCPTool(
    server_label="github",
    server_url=os.getenv("GITHUB_MCP_URL"),
    require_approval="never",
    project_connection_id=os.getenv("GITHUB_CONNECTION_ID"),
)

mcp_tool_own_live = MCPTool(
    server_label="own",
    server_url=os.getenv("OWN_MCP_URL"),
    require_approval="never",
)


# ── the agent ────────────────────────────────────────────────────────────────
# One instruction per server. They have to differ: the GitHub server serves every
# repository on GitHub and has no idea which one this project is, so without the
# owner/repo named here it answers "which repository do you mean?" and never calls
# the tool. The tile's suggested prompts don't name a repo, and a visitor won't
# either.
INSTRUCTIONS = {
    "github": (
        "You answer questions about one repository: owner MohamedElmi10, "
        "repo AI-Arena-platform, default branch main. Assume that repository "
        "unless the user names a different one — never ask which repo. "
        "Always call your tools; never answer from memory."
    ),
    "own": (
        "You answer questions about the AI Arena site itself: which demos exist, "
        "which are live, and what they are built on. "
        "Always call your tools; never answer from memory."
    ),
}


def create_agent(mcp_tool, suffix=""):
    """One agent per server, on purpose.

    Give one agent both servers and the model picks which to call, so the
    hosted/own toggle stops proving anything. One tool per agent keeps "which
    server answered" a fact rather than a guess — hence the suffixed name, so
    the two versions don't overwrite each other. `suffix` separates the live
    pair from this script's pair for the same reason.
    """
    return project_client.agents.create_version(
        agent_name=f"{os.getenv('MCP_AGENT_NAME')}-{mcp_tool.server_label}{suffix}",
        definition=PromptAgentDefinition(
            model=os.getenv("MODEL_ENDPOINT"),
            instructions=INSTRUCTIONS[mcp_tool.server_label],
            tools=[mcp_tool],
        ),
    )


def ask(agent, question):
    """Send the question. The agent is referenced by name, not by object.

    Ask something the model cannot already know — if it could have guessed, the
    tool proved nothing.
    """
    conversation = openai_client.conversations.create()
    return openai_client.responses.create(
        conversation=conversation.id,
        input=question,
        extra_body={"agent_reference": {"name": agent.name, "type": "agent_reference"}},
    )


# ── approval ─────────────────────────────────────────────────────────────────
def collect_approvals(response, server_label):
    """With require_approval="always" the first response holds no answer.

    It holds a request for permission. response.output is a mixed list, so the
    type guard is what makes item.id mean anything.

    The prompt is the feature, not decoration. A server you do not control is
    asking to run something with arguments you did not write, and auto-approving
    it here would demonstrate nothing that "never" doesn't already do. Say n to
    watch the agent try to answer without the tool.
    """
    approvals: ResponseInputParam = []

    for item in response.output:
        if item.type != "mcp_approval_request":
            continue
        if item.server_label != server_label:
            continue

        print(f"\n  {item.server_label} wants to call: {item.name}")
        print(f"  with: {item.arguments}")

        approve = input("  approve? [y/N] ").strip().lower() == "y"
        approvals.append(
            McpApprovalResponse(
                type="mcp_approval_response",
                approve=approve,
                approval_request_id=item.id,
            )
        )

    return approvals


def send_approval(agent, approvals, previous_response_id):
    """Send permission back. The next response either answers or asks again.

    Note what is NOT sent: the tool result. In the function-calling tile this
    script ran the function itself. Here it grants permission and Foundry calls
    the server — this code never touches GitHub.

    previous_response_id replaces conversation= on this call; passing both is an
    error, because the chained response already implies the conversation.
    """
    return openai_client.responses.create(
        input=approvals,
        previous_response_id=previous_response_id,
        extra_body={"agent_reference": {"name": agent.name, "type": "agent_reference"}},
    )


MAX_APPROVAL_ROUNDS = 5


def converse(agent, tool, question):
    """Ask, then approve until the agent stops asking.

    Approval is a loop, not a single exchange. One tool call needs one round,
    but nothing promises the model only wants one — and when it wants two, a
    single round-trip returns an empty answer that looks exactly like a broken
    server. The round cap is there because "approve whatever it asks" is a loop
    you do not want unbounded.
    """
    response = ask(agent, question)
    rounds = 0

    while rounds < MAX_APPROVAL_ROUNDS:
        approvals = collect_approvals(response, tool.server_label)
        if not approvals:
            break
        response = send_approval(agent, approvals, response.id)
        rounds += 1

    if response.output_text:
        print(f"\n{response.output_text}")
    elif rounds == 0:
        print("\nAnswered without calling the tool — the instructions are too weak.")
    else:
        print(f"\nEmpty answer after {rounds} approval round(s). Output items:")
        for item in response.output:
            print(f"  {item.type}")


# ── main ─────────────────────────────────────────────────────────────────────
# Each question sits next to the server that can answer it. Same shape, two
# servers — the symmetry is the demo.
PATHS = {
    "A": (
        mcp_tool_hosted,
        "What were the last three commits to MohamedElmi10/AI-Arena-platform?",
    ),
    "B": (
        mcp_tool_own,
        "How many tiles on AI Arena are live, and which ones?",
    ),
}


def publish_live_agents():
    """Create the two agents the tile calls, and print the names to deploy with.

    Run this after every merge. The dev agents point at whatever OWN_MCP_URL was
    set to while you were building — usually a deploy preview, which dies with
    the PR and leaves the live agent pinned to a host that no longer exists.
    """
    for tool in (mcp_tool_hosted_live, mcp_tool_own_live):
        agent = create_agent(tool, suffix="-live")
        print(f"  {tool.server_label:<7} {agent.name} v{agent.version}")
        print(f"          -> {tool.server_url}")

    print("\n  Set these on Netlify:")
    print(f"    MCP_AGENT_HOSTED_NAME={os.getenv('MCP_AGENT_NAME')}-github-live")
    print(f"    MCP_AGENT_OWN_NAME={os.getenv('MCP_AGENT_NAME')}-own-live")


def main():
    while True:
        print("\n  A. hosted — ask GitHub's server what changed in the repo")
        print("  B. own    — ask AI Arena's server what it ships")
        print("  L. publish the live agents the tile calls (approval off)")
        print("  Q. quit")

        choice = input("\n> ").strip().upper()
        if choice == "Q":
            return
        if choice == "L":
            try:
                publish_live_agents()
            except Exception as exc:
                print(f"\nfailed: {type(exc).__name__}: {exc}")
            continue
        if choice not in PATHS:
            continue

        tool, question = PATHS[choice]

        # Caught so one transient Azure blip doesn't end the session — this is a
        # menu you poke at, not a pipeline.
        try:
            agent = create_agent(tool)
            print(f"\nserver: {tool.server_label}  ·  agent: {agent.name} v{agent.version}")
            print(f"asking: {question}")
            converse(agent, tool, question)
        except Exception as exc:
            print(f"\nfailed: {type(exc).__name__}: {exc}")


if __name__ == "__main__":
    main()
