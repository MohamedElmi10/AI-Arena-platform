# T-007: Wire Foundry Chat Agent runtime

**Status:** open
**Blocked by:** T-004, T-005, T-006
**Blocks:** T-008

## Goal
Replace the fake stream in the Foundry Chat Agent playground with a real Azure streaming call, gated by the cost-safety middleware.

## Acceptance
- [ ] `app/api/chat/foundry-chat-agent/route.ts` handles `POST` with `{ message: string }`.
- [ ] Handler wrapped in `withCostSafety(...)` from T-005. A route that isn't wrapped fails review.
- [ ] Calls the Foundry endpoint via Node `openai` package (`openai.responses.create({ stream: true, ... })`) using `AZURE_OPENAI_ENDPOINT` + `AZURE_OPENAI_API_KEY` from env.
- [ ] Streams `response.output_text.delta` events back to the client (SSE or a `Response` body with a `ReadableStream`).
- [ ] Client `<ChatSurface>` consumes the stream, updates the current bubble in real time.
- [ ] `<LiveStats>` reads real values:
  - `Tokens`: count of delta events (or accumulated string length, whichever is honest).
  - `Latency`: `performance.now()` at first delta vs. request start.
  - `Status`: flips `idle → streaming → idle`.
- [ ] Cost-safety errors (rate limited, budget capped, kill switch) render as a distinct assistant bubble with the friendly message, not a raw JSON dump.

## Notes
- Pick **one** streaming pattern for the whole project — Vercel AI SDK (`ai` package) or hand-rolled SSE — and commit to it. No mixing.
- Runtime path per `docs/CONTEXT.md` §Runtime Path: browser → API route → Foundry endpoint → back. No client-side Azure calls, ever.
- If Foundry access shifted to Azure OpenAI in T-006, the openai package call is nearly identical — just the endpoint URL changes.
