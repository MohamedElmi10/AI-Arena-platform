import type { ResponseCreateParamsStreaming } from "openai/resources/responses/responses";
import { withCostSafety, type CostSafetyHandler } from "@/lib/cost-safety";
import { getAgentCredential } from "@/lib/agent-credential";
import OpenAI from "openai";

// POST /api/chat/text-analysis-agent — runtime path for the Text Analysis tile.
// Proxies the browser to the Foundry-hosted "text-analysis-agent" (which owns
// the Azure Language MCP tool). Wrapped in withCostSafety per ADR-0001.
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

type Msg = { role: "user" | "assistant"; content: string };

const handler: CostSafetyHandler = async (req, ctx) => {
  const body = (await req.json().catch(() => ({}))) as {
    message?: string;
    messages?: Msg[];
  };

  // Accept the shared Playground's { message } (single turn) OR a full { messages }
  // history. Bounded to the last 12 either way (memory cap — ADR-0001).
  let input: Msg[];
  if (Array.isArray(body.messages) && body.messages.length > 0) {
    input = body.messages.slice(-12);
  } else if (typeof body.message === "string" && body.message.trim() !== "") {
    input = [{ role: "user", content: body.message }];
  } else {
    return jsonError("bad_request", "Send { message } or { messages }.", 400);
  }

  const baseUrl = `${process.env.PROJECT_ENDPOINT!.replace(/\/$/, "")}/agents/${process.env.TEXT_ANALYSIS_AGENT_NAME}/endpoint/protocols/openai`;
  const { token } = await getAgentCredential().getToken(AGENT_SCOPE);
  const client = new OpenAI({
    baseURL: baseUrl,
    apiKey: token,
    defaultQuery: { "api-version": "2025-11-15-preview" },
  });

  // The hosted agent supplies its own model, instructions, and Language tool;
  // we send only the conversation, capped to the token budget (ADR-0001).
  const payload = ctx.clampMaxTokens({
    input,
    max_output_tokens: ctx.maxOutputTokens,
    stream: true,
  });
  const azureStream = await client.responses.create(
    payload as ResponseCreateParamsStreaming
  );

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of azureStream) {
          if (event.type === "response.output_text.delta") {
            controller.enqueue(sse({ delta: event.delta }));
          } else if (event.type === "response.completed") {
            controller.enqueue(
              sse({ done: true, outputTokens: event.response.usage?.output_tokens })
            );
          }
        }
      } catch (err) {
        console.error("[text-analysis] stream error:", err);
        controller.enqueue(
          sse({ error: "stream_error", message: "The response was cut off. Please try again." })
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

export const POST = withCostSafety(handler);
