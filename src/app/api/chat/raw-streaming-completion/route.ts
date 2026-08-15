import type {
  ResponseCreateParamsNonStreaming,
  ResponseCreateParamsStreaming,
} from "openai/resources/responses/responses";
import { withCostSafety, type CostSafetyHandler } from "@/lib/cost-safety";
import {
  getFoundryClient,
  getModelDeployment,
  SYSTEM_PROMPT,
} from "@/lib/foundry";

// POST /api/chat/raw-streaming-completion — runtime for the Gen-AI baseline tile
// (T-016). Same gpt-5-mini deployment as tile #1, no agent framing. Node is async
// either way, so to make the contrast visible: mode 'async' streams deltas as they
// arrive; mode 'sync' blocks for the whole completion, then sends it in one frame.
// Wrapped in withCostSafety per ADR-0001. The openai SDK needs the Node runtime.
export const runtime = "nodejs";

const encoder = new TextEncoder();

const SSE_HEADERS = {
  "content-type": "text/event-stream; charset=utf-8",
  "cache-control": "no-cache, no-transform",
  connection: "keep-alive",
};

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
  let mode: unknown;
  try {
    ({ message, mode } = await req.json());
  } catch {
    message = undefined;
  }
  if (typeof message !== "string" || message.trim() === "") {
    return jsonError("bad_request", "Send a non-empty { message: string }.", 400);
  }

  const client = getFoundryClient();
  const model = getModelDeployment();

  // ASYNC (default) — stream Azure's deltas straight out as they arrive.
  if (mode !== "sync") {
    const base = {
      model,
      instructions: SYSTEM_PROMPT,
      input: message,
      max_output_tokens: ctx.maxOutputTokens,
      stream: true,
    } satisfies ResponseCreateParamsStreaming;
    const azureStream = await client.responses.create(ctx.clampMaxTokens(base));

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
            } else if (event.type === "response.incomplete") {
              // Token cap (or other stop) reached — Azure ends the stream here,
              // not on completed. Emit the terminal frame so the client still
              // reconciles usage, flagged so it can note the cut-off.
              controller.enqueue(
                sse({
                  done: true,
                  truncated: true,
                  outputTokens: event.response.usage?.output_tokens,
                })
              );
            }
          }
        } catch (err) {
          console.error("[raw-streaming async] stream error:", err);
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
    return new Response(stream, { headers: SSE_HEADERS });
  }

  // SYNC — block for the full completion, then emit it in a single frame. The
  // visitor waits, then the whole answer lands at once: the blocking call made
  // visible. Same SSE shape so the client parses both modes identically.
  const base = {
    model,
    instructions: SYSTEM_PROMPT,
    input: message,
    max_output_tokens: ctx.maxOutputTokens,
  } satisfies ResponseCreateParamsNonStreaming;
  const response = await client.responses.create(ctx.clampMaxTokens(base));
  const truncated = response.status === "incomplete";

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(sse({ delta: response.output_text }));
      controller.enqueue(
        sse({
          done: true,
          outputTokens: response.usage?.output_tokens,
          ...(truncated ? { truncated: true } : {}),
        })
      );
      controller.close();
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
};

export const POST = withCostSafety(handler);
