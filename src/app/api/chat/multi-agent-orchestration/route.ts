import type { ResponseCreateParamsStreaming } from "openai/resources/responses/responses";
import { withCostSafety, type CostSafetyHandler } from "@/lib/cost-safety";
import { getAgentCredential } from "@/lib/agent-credential";
import OpenAI from "openai";

// POST /api/chat/multi-agent-orchestration — runtime path for T-014.
//
// Calls the Foundry Workflow `trip-planner` (a sequential A2A chain of three
// agents) by name via agent_reference, and streams a TIMELINE to the browser:
// one event per agent step + its handoff, plus the text each agent produces.
// The key never leaves the server.
//
// Invocation mirrors build.py (the verified Python call):
//   POST {PROJECT_ENDPOINT}/openai/v1/responses
//   body: { conversation, input, agent_reference: {type, name}, stream }
// The workflow's OnConversationStart trigger fires on the conversation's first
// message, so we create a conversation, run, and delete it in `finally`.
//
// Wrapped in withCostSafety per ADR-0001 on its own budget key: one run is 3+
// model calls, so it must not drain the shared chat allowance.
export const runtime = "nodejs";

const AGENT_SCOPE = "https://ai.azure.com/.default";

const encoder = new TextEncoder();
const sse = (payload: unknown): Uint8Array =>
  encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
const jsonError = (error: string, message: string, status: number): Response =>
  new Response(JSON.stringify({ error, message }), {
    status,
    headers: { "content-type": "application/json" },
  });

// A workflow step as seen in the stream. action_id is the node id (Researcher /
// Planner / Budget); agent_reference.name is the agent behind it.
type WorkflowActionItem = {
  type?: string;
  action_id?: string;
  previous_action_id?: string;
  status?: string;
  agent_reference?: { name?: string };
};

const handler: CostSafetyHandler = async (req) => {
  const body = (await req.json().catch(() => ({}))) as { message?: string };

  if (typeof body.message !== "string" || body.message.trim() === "") {
    return jsonError("bad_request", "Send a non-empty { message: string }.", 400);
  }

  const workflowName = process.env.MULTI_AGENT_WORKFLOW;
  const projectEndpoint = process.env.PROJECT_ENDPOINT;
  if (!workflowName || !projectEndpoint) {
    console.error("[multi-agent] MULTI_AGENT_WORKFLOW or PROJECT_ENDPOINT unset");
    return jsonError("misconfigured", "This demo isn't available right now.", 503);
  }

  // The project-level OpenAI surface — NOT a per-agent endpoint. Invoking a
  // workflow addresses it by name in the body (agent_reference), so the base is
  // the project's /openai/v1, same as the REST docs.
  const baseURL = `${projectEndpoint.replace(/\/$/, "")}/openai/v1`;
  const { token } = await getAgentCredential().getToken(AGENT_SCOPE);
  const client = new OpenAI({ baseURL, apiKey: token });

  // OnConversationStart trigger → the run needs a conversation to start.
  let conversationId: string | undefined;
  try {
    const conversation = await client.conversations.create();
    conversationId = conversation.id;
  } catch (err) {
    console.error("[multi-agent] could not create conversation:", err);
    return jsonError("upstream_error", "Couldn't start the workflow. Try again.", 502);
  }

  // agent_reference isn't in the OpenAI types (it's a Foundry extension), so the
  // payload is built loosely and cast.
  //
  // NOTE: a workflow invocation REJECTS max_output_tokens ("Not allowed",
  // invalid_payload) — the per-call token cap lives on each agent's own config,
  // not the workflow request. So per-request bounding falls to the agents'
  // concise instructions; withCostSafety's daily budget cap + kill switch (the
  // other two ADR-0001 layers) still apply.
  const payload = {
    input: body.message,
    conversation: conversationId,
    agent_reference: { type: "agent_reference", name: workflowName },
    stream: true,
  };

  // Kick the run before opening the stream so an auth/config failure returns a
  // real message instead of a silent 500 (learned on the MCP tile).
  let azureStream;
  try {
    azureStream = await client.responses.create(
      payload as unknown as ResponseCreateParamsStreaming
    );
  } catch (err) {
    const status = (err as { status?: number }).status;
    console.error(`[multi-agent] workflow "${workflowName}" failed:`, status, err);
    if (conversationId) {
      await client.conversations.delete(conversationId).catch(() => {});
    }
    return jsonError(
      "upstream_error",
      status === 401 || status === 403
        ? "This demo can't reach its agents right now."
        : "Something went wrong reaching the workflow. Please try again.",
      502
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Which node's text is currently streaming, so deltas attach to the right
      // step in the timeline.
      let currentStep: string | undefined;
      try {
        for await (const event of azureStream) {
          if (
            event.type === "response.output_item.added" ||
            event.type === "response.output_item.done"
          ) {
            const item = (event as { item?: WorkflowActionItem }).item;
            if (item?.type === "workflow_action") {
              currentStep = item.action_id;
              // One timeline event per step change: id, the agent behind it, the
              // handoff (previous_action_id), and status.
              controller.enqueue(
                sse({
                  step: {
                    id: item.action_id,
                    agent: item.agent_reference?.name,
                    previous: item.previous_action_id,
                    status: item.status,
                  },
                })
              );
            }
          } else if (event.type === "response.output_text.delta") {
            controller.enqueue(
              sse({ delta: event.delta, step: currentStep })
            );
          } else if (event.type === "response.completed") {
            controller.enqueue(
              sse({
                done: true,
                outputTokens: event.response.usage?.output_tokens,
              })
            );
          }
        }
      } catch (err) {
        console.error("[multi-agent] stream error:", err);
        controller.enqueue(
          sse({
            error: "stream_error",
            message: "The run was cut off. Please try again.",
          })
        );
      } finally {
        if (conversationId) {
          await client.conversations.delete(conversationId).catch(() => {});
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
};

// Own budget key — a workflow run costs several model calls, like the MCP tile.
export const POST = withCostSafety(handler, { limit: 100, key: "multi-agent" });
