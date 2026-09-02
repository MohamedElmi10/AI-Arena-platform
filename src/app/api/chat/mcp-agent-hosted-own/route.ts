import type { ResponseCreateParamsStreaming } from "openai/resources/responses/responses";
import { withCostSafety, type CostSafetyHandler } from "@/lib/cost-safety";
import { getAgentCredential } from "@/lib/agent-credential";
import OpenAI from "openai";

// POST /api/chat/mcp-agent-hosted-own — runtime path for tile #4.
//
// Proxies the browser to one of two Foundry-hosted agents. They are identical
// except for which MCP server they carry, which is the entire point: the toggle
// changes who answers, not how the question is asked.
//
//   mode "hosted" -> the agent holding GitHub's MCP server
//   mode "own"    -> the agent holding this app's own server (/api/mcp)
//
// Both live agents use require_approval="never". build.py uses "always" so you
// can watch the permission round-trip once; a public tile cannot wait for a
// click nobody makes. See the tile README.
//
// Wrapped in withCostSafety per ADR-0001, on its own budget key: one MCP
// question costs ~10-20x a chat turn, because every tool's schema is sent to the
// model on every request. It should not drain the chat tiles' allowance.
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

type Mode = "hosted" | "own";

const AGENTS: Record<Mode, { env: string; label: string }> = {
  hosted: { env: "MCP_AGENT_HOSTED_NAME", label: "GitHub's MCP server" },
  own: { env: "MCP_AGENT_OWN_NAME", label: "AI Arena's own MCP server" },
};

const handler: CostSafetyHandler = async (req, ctx) => {
  const body = (await req.json().catch(() => ({}))) as {
    message?: string;
    mode?: string;
  };

  if (typeof body.message !== "string" || body.message.trim() === "") {
    return jsonError("bad_request", "Send a non-empty { message: string }.", 400);
  }

  // Default to hosted rather than 400 on a missing mode: the shared Playground
  // only sends one when the tile declares modes, and a broken toggle should
  // still answer.
  const mode: Mode = body.mode === "own" ? "own" : "hosted";
  const { env, label } = AGENTS[mode];

  const agentName = process.env[env];
  if (!agentName) {
    console.error(`[mcp-agent] ${env} is not set`);
    return jsonError("misconfigured", "This demo isn't available right now.", 503);
  }

  // No conversation history is sent. Each question is answered from the tools,
  // and carrying turns would only invite the model to reuse an earlier tool
  // result instead of calling again — which is the one thing this tile is
  // trying to show.
  const baseUrl = `${process.env.PROJECT_ENDPOINT!.replace(/\/$/, "")}/agents/${agentName}/endpoint/protocols/openai`;
  const { token } = await getAgentCredential().getToken(AGENT_SCOPE);
  const client = new OpenAI({
    baseURL: baseUrl,
    apiKey: token,
    defaultQuery: { "api-version": "2025-11-15-preview" },
  });

  const payload = ctx.clampMaxTokens({
    input: [{ role: "user", content: body.message }],
    max_output_tokens: ctx.maxOutputTokens,
    stream: true,
  });

  // This call happens BEFORE the stream exists, so a rejection here escapes to
  // withCostSafety's catch-all and the real Azure message is lost. It cost an
  // afternoon once: a 500 that said nothing, because the two agents differ only
  // in whether they need a project connection — and reading one is a separate
  // permission from invoking an agent.
  let azureStream;
  try {
    azureStream = await client.responses.create(
      payload as ResponseCreateParamsStreaming
    );
  } catch (err) {
    const status = (err as { status?: number }).status;
    console.error(`[mcp-agent] ${mode} agent "${agentName}" failed:`, status, err);
    return jsonError(
      "upstream_error",
      status === 401 || status === 403
        ? "This demo can't reach its tools right now."
        : "Something went wrong reaching the model. Please try again.",
      502
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Whether a tool was actually called. If the model answers from memory the
      // demo has silently failed, and saying so is more useful than a confident
      // wrong answer about a repo the visitor can go and check.
      let calledTool = false;
      try {
        for await (const event of azureStream) {
          // An MCP call appears as an output item, not a text delta. Surface it
          // the moment it arrives — seeing the call is the demo, the answer is
          // just the consequence.
          if (event.type === "response.output_item.added") {
            const item = (event as { item?: { type?: string; name?: string } }).item;
            if (item?.type === "mcp_call") {
              calledTool = true;
              controller.enqueue(
                sse({ delta: `🔌 ${label} → \`${item.name ?? "tool"}\`\n\n` })
              );
            }
          } else if (event.type === "response.output_text.delta") {
            controller.enqueue(sse({ delta: event.delta }));
          } else if (event.type === "response.completed") {
            // The streamed item event is the nice-to-have; the completed
            // response's output array is the authority. Checking both means a
            // change in event shape costs us the inline line, not a footer that
            // calls a real tool call imaginary.
            const usedTool =
              calledTool ||
              event.response.output.some(
                (o) => (o as { type?: string }).type === "mcp_call"
              );
            if (!usedTool) {
              controller.enqueue(
                sse({
                  delta:
                    "\n\n_Answered without calling the tool — so this came from the model's memory, not from " +
                    label +
                    "._",
                })
              );
            }
            controller.enqueue(
              sse({
                done: true,
                outputTokens: event.response.usage?.output_tokens,
              })
            );
          }
        }
      } catch (err) {
        console.error("[mcp-agent] stream error:", err);
        controller.enqueue(
          sse({
            error: "stream_error",
            message: "The response was cut off. Please try again.",
          })
        );
      } finally {
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

export const POST = withCostSafety(handler, { limit: 100, key: "mcp" });
