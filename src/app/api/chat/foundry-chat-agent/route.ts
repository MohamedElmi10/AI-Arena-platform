import type { ResponseCreateParamsStreaming } from "openai/resources/responses/responses";
import { withCostSafety, type CostSafetyHandler } from "@/lib/cost-safety";
import {
  getFoundryClient,
  getModelDeployment,
  SYSTEM_PROMPT,
} from "@/lib/foundry";

// POST /api/chat/foundry-chat-agent — the runtime path for tile #1
// (docs/CONTEXT.md §Runtime Path): browser → this route → Azure → back.
// Wrapped in withCostSafety per ADR-0001 (non-negotiable). The openai SDK needs
// the Node runtime, not edge.
export const runtime = "nodejs";

const encoder = new TextEncoder();

/** One SSE frame. Client reads these off response.body line by line. */
function sse(payload: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

function jsonError(error: string, message: string, status: number): Response {
  return new Response(JSON.stringify({ error, message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const handler: CostSafetyHandler = async (req, ctx) => {
  let message: unknown;
  try {
    ({ message } = await req.json());
  } catch {
    message = undefined;
  }
  if (typeof message !== "string" || message.trim() === "") {
    return jsonError(
      "bad_request",
      "Send a non-empty { message: string }.",
      400
    );
  }

  // Mirror build.py's Responses call, but clamp max_output_tokens to the cap
  // first (ADR-0001 layer 1 — the handler applies it, not the middleware).
  // Set the cap up front, then let clampMaxTokens enforce it (the ADR-mandated
  // enforcement point). `satisfies` keeps the literal type — including
  // `stream: true` — so create()'s streaming overload resolves correctly.
  const basePayload = {
    model: getModelDeployment(),
    instructions: SYSTEM_PROMPT,
    input: message,
    max_output_tokens: ctx.maxOutputTokens,
    stream: true,
  } satisfies ResponseCreateParamsStreaming;
  const payload = ctx.clampMaxTokens(basePayload);

  const client = getFoundryClient();
  const azureStream = await client.responses.create(payload);

  // Reflect Azure's delta stream out to the browser as SSE. One frame per
  // output_text.delta; a final frame carries the real token usage.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of azureStream) {
          if (event.type === "response.output_text.delta") {
            controller.enqueue(sse({ delta: event.delta }));
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
        console.error("[foundry-chat] stream error:", err);
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

export const POST = withCostSafety(handler);
