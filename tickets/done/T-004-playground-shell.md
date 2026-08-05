# T-004: Playground shell + Split layout (fake stream)

**Status:** open
**Blocked by:** T-003
**Blocks:** T-007

## Goal
Build the `/agents/[slug]` route (and Gen-AI / NL variants) rendering the Split playground layout with a fake stream so the visual works before Azure is wired.

## Acceptance
- [ ] Dynamic route `app/agents/[slug]/page.tsx` exists. Also `app/genai/[slug]/page.tsx`, `app/nl/[slug]/page.tsx` (thin wrappers around the same components).
- [ ] Renders sticky breadcrumb (`← AI Arena / Chapter NN · Module / Tile Title`) with a Live pill on the right.
- [ ] Title block: Chapter pill + tile title (accent-fg) + tagline (italic) + accent underscore.
- [ ] `<LiveStats>` bar below the title: Model / Tokens / Latency / Status. Wired to fake stream — status flips `idle → streaming → idle`; tokens and latency tick up.
- [ ] `<PlaygroundGuide>` on the left (5/12): About / Try this (buttons) / What to expect / Under-the-hood expander.
- [ ] "Try this" prompts are tap-to-insert buttons that populate the chat input.
- [ ] `<ChatSurface>` on the right (7/12): tinted header, scrollable message list, streaming bubble with blinking cursor, input, accent Send button.
- [ ] Fake stream: canned response types out character-by-character on submit.
- [ ] Content sourced from `data/modules.ts` — extend each tile's schema with `guide: { about, tryThis: string[], expect: string[], hood: string[] }`.
- [ ] Only `foundry-chat-agent` has real guide content for now. Others 404 (Next.js `notFound()`).

## Notes
- Reference: `docs/prototypes/playground-split.html` (the winning layout with the stats bar folded in).
- Component split: `<PlaygroundHeader>` (breadcrumb + title + stats), `<PlaygroundGuide>`, `<ChatSurface>`. Keep each ≤ 100 lines if possible.
- Streaming stays fake until T-007.
- The chat state is client-side (React `useState` — no persistence, matches ADR-0001 assumptions).
