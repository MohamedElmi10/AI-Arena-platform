# T-019: Format RAG answers & make cited sources clickable

**Status:** open
**Blocked by:** T-011 (RAG runtime — clickable sources need the citation stream from its `route.ts`)
**Blocks:** —
**Module:** Agents · **Slug:** `rag-agent-with-grounding-memory` (Part A is shared across all tiles)

## Goal
Every agent answer currently renders as one clumped block of running text. The model emits Markdown (`**bold**`, paragraphs, lists) but the chat bubble prints it raw — so `**keyword**` shows literal asterisks and there's no breathing room between ideas. Separately, the RAG tile's whole selling point is grounded citations, yet the sources it retrieves are never shown, let alone clickable. Fix both: readable, well-spaced answers everywhere, and clickable sources on the RAG tile.

Two concerns, one ticket — they live in the same chat bubble.

## Part A — Readable answers (shared: `ChatSurface`) — DONE
`src/components/playground/ChatSurface.tsx` rendered `m.text` as a raw string inside a `whitespace-pre-line` div. Now routed through a small dependency-free `Markdown` renderer (`src/components/playground/Markdown.tsx`) so bold, paragraphs, and lists render with real spacing between blocks.

- [x] Agent replies render Markdown: **bold**, paragraphs, and `-` / `1.` lists — no literal `**` or `#` leaking through.
- [x] Real vertical spacing between paragraphs and list items (the "clumped text" is gone). User bubbles unchanged.
- [x] XSS-safe: the renderer builds React elements and never sets raw HTML (no `rehype-raw`, no `dangerouslySetInnerHTML`). Why: the reply is untrusted model text rendered in the browser.
- [x] Streaming still works: partial Markdown mid-stream degrades gracefully (an unclosed `**` renders literally, no crash), and the blinking caret still trails the last agent bubble (passed as `trailing`).
- [x] Because `ChatSurface` is shared, all three tiles (foundry-chat, function-calling, rag) benefit.
- [x] No new runtime dependency added (hand-rolled renderer, ~60 lines). Free + OSS by construction.
- [x] Covered by unit tests: `src/components/playground/markdown.test.ts` (bold / lists / spacing / graceful degradation / caret). Vitest gained a `@/` path alias so component tests resolve imports.

## Part B — Clickable sources (RAG-specific) — DONE
`src/app/api/chat/rag-agent-with-grounding-memory/route.ts` currently forwards only `response.output_text.delta` and `response.completed` and drops everything else — so Azure's citation annotations never reach the browser. Surface them.

- [x] Route forwards the retrieval citations Azure emits (the annotation/citation events on the Responses stream — e.g. `response.output_text.annotation.added`, or the annotations on the completed output item) as their own SSE frame, alongside the text deltas. Keep the handler inside `withCostSafety(...)` — no new Azure route is added, so the existing wrap stands (ADR-0001).
- [x] `ChatMessage` carries the sources for an agent turn; `Playground` collects the citation frames into that message.
- [x] `ChatSurface` renders a "Sources" affordance under a RAG answer where each cited source is clickable. Link target is Mohamed's call — the corpus doc on the public GitHub repo (`src/app/agents/rag-agent-with-grounding-memory/corpus/<file>.md`) is the obvious free option; an in-app viewer is fine too. Requirement: clickable, and it lands on the right source.
- [ ] Inline citation markers in the text (if the agent emits `[n]` / bracketed markers) map to the sources list — nice-to-have, not blocking.
- [x] Non-RAG tiles (which send no citations) show no empty "Sources" block.

## Out of scope
- No change to what the agent retrieves or how grounding works (that is T-011; corpus freshness is T-018).
- No restyle of the playground beyond the answer bubble and its sources.

## Notes
- **Part B done.** Azure emits a `response.output_text.annotation.added` event per citation; the `url_citation` carries the corpus filename as `title` (e.g. `08-tile-rag-agent.md`) — its `url` is only the search endpoint, so the client links the file itself. The route de-dupes by filename and forwards them on the `done` SSE frame; `ChatSurface` shows a Sources chip row that opens an in-app viewer (`SourceViewer` → `GET /api/corpus/<file>`, whitelisted read, reuses `Markdown`). Chose the in-app viewer over a GitHub link — portfolio-primary, keeps visitors in-app.
- Inline `【n†source】` markers are stripped from the bubble (Part A) rather than mapped to the list — the mapping was the ticket's explicit nice-to-have, deferred.
- **Deploy caveat (T-009):** `/api/corpus/<file>` reads the corpus from disk at runtime. Works in dev and on a Node server; on Netlify serverless, add the corpus dir to `outputFileTracingIncludes` in `next.config` so the files ship with the function.
- Part A shipped first because it stands alone and improves every tile. Part B is blocked: it edits `route.ts` and `Playground.tsx`, which only exist on the T-011 branch — do Part B once T-011 lands on `main`.
- Verify Part A: `npm test` (the markdown suite), then `npm run dev` and ask any tile a question — the reply is formatted with real spacing and no stray `**`.
