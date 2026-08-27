import type { ResponseCreateParamsStreaming } from "openai/resources/responses/responses";
import { withCostSafety, type CostSafetyHandler } from "@/lib/cost-safety";
import type { Source } from "@/lib/sse";
import { getAgentCredential } from "@/lib/agent-credential";
import OpenAI from "openai";

// POST /api/chat/rag-agent-with-grounding-memory — runtime path for tile #3.
// Proxies the browser to the Foundry-hosted "rag-agent" (which owns the Azure AI
// Search tool + index). Wrapped in withCostSafety per ADR-0001 (non-negotiable).
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
  // history (memory). Bounded to the last 12 either way (memory cap — ADR-0001).
  let input: Msg[];
  if (Array.isArray(body.messages) && body.messages.length > 0) {
    input = body.messages.slice(-12);
  } else if (typeof body.message === "string" && body.message.trim() !== "") {
    input = [{ role: "user", content: body.message }];
  } else {
    return jsonError("bad_request", "Send { message } or { messages }.", 400);
  }

  const baseUrl = `${process.env.PROJECT_ENDPOINT!.replace(/\/$/, "")}/agents/${process.env.RAG_AGENT_NAME}/endpoint/protocols/openai`;
  const { token } = await getAgentCredential().getToken(AGENT_SCOPE);
  const client = new OpenAI({
    baseURL: baseUrl,
    apiKey: token,
    defaultQuery: { "api-version": "2025-11-15-preview" },
  });

  // The hosted agent supplies its own model + instructions; we send only the
  // conversation, capped to the token budget (ADR-0001 layer 1).
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
      // Cited sources for this answer, de-duped by filename. The agent emits an
      // `annotation.added` event per citation; Azure's url_citation carries the
      // corpus filename as `title` (its `url` is just the search endpoint, so we
      // ignore it and let the client link the file). Sent on the done frame.
      const sources = new Map<string, Source>();
      try {
        for await (const event of azureStream) {
          if (event.type === "response.output_text.delta") {
            controller.enqueue(sse({ delta: event.delta }));
          } else if (event.type === "response.output_text.annotation.added") {
            const ann = (event as { annotation?: { type?: string; title?: string } })
              .annotation;
            if (ann?.title) sources.set(ann.title, { title: ann.title });
          } else if (event.type === "response.completed") {
            controller.enqueue(
              sse({
                done: true,
                outputTokens: event.response.usage?.output_tokens,
                sources: [...sources.values()],
              })
            );
          }
        }
      } catch (err) {
        console.error("[rag-agent] stream error:", err);
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
