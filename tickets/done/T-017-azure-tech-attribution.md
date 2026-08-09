# T-017: Azure / Microsoft tech attribution + architecture diagram

**Status:** open
**Blocked by:** T-003, T-004  (the landing tiles + playground shell it enhances — both done)
**Blocks:** —

## Goal
Make it immediately obvious to a visitor *which Microsoft/Azure technology powers each demo*. Today the stack is only hinted at inside the playground's "Under the hood" expander — someone skimming the landing gets no signal that this is Azure AI work. Surface the attribution clearly and consistently on the landing tiles and in the playground, in a way that fits the Editorial · Colored aesthetic.

## Brand-compliance constraint (READ FIRST)
Per [Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks): a third party **may not use Microsoft's or Azure's logos/marks without an express license** — those require a partner licensing arrangement. You **may** use the **wordmarks** (the product *names* as text: "Microsoft Azure", "Azure AI Foundry", "Azure Language", etc.) to *truthfully* state what the app is built with, provided it does not imply Microsoft affiliation, sponsorship, or endorsement.

**Therefore this ticket uses:**
1. For attribution UI (tiles/hero/playground): wordmark **text** + **our own neutral spark glyph** — NOT any Microsoft/Azure brand *logo*.
2. For the architecture diagram (below): the **official Azure architecture icons** ([terms](https://learn.microsoft.com/en-us/azure/architecture/icons/)), which Microsoft *permits* in "architectural diagrams, training materials, or documentation" with the product name shown near each icon. These are a different, licensed-for use than brand logos — used as-is (not cropped/flipped/distorted), only inside the diagram, never to brand the app. Source + terms recorded in `public/icons/NOTICE.md`.

## Acceptance
- [ ] Tile schema gains a `poweredBy` field naming the specific Azure service(s) for that tile — e.g. `"Azure AI Foundry"`, `"Azure Language"`, `"Azure Speech"`, `"Azure Translator"`. Data-driven; one source of truth in `data/modules.ts`.
- [ ] Every landing tile shows its `poweredBy` **wordmark** attribution (JetBrains Mono metadata style, subtle, module accent), paired with a small **custom** stack glyph (our own SVG — not a Microsoft mark).
- [ ] Playground shows a clear **"Powered by <Azure service>"** wordmark treatment near the header / LiveStats, alongside the existing Model stat.
- [ ] Landing hero states the overall stack once (e.g. a "Built on Microsoft Azure AI" wordmark line in the masthead).
- [ ] A subtle, honest **non-affiliation** note somewhere unobtrusive (e.g. footer): "Microsoft and Azure are trademarks of Microsoft. This is an independent portfolio, not affiliated with or endorsed by Microsoft."
- [ ] Attribution styling defined **once** and reused across `<Tile>` and the playground — not restyled ad hoc.
- [ ] Accessible: attribution is real text (not an image); the custom glyph carries alt text / `aria-hidden` as appropriate.
- [ ] **No** Microsoft/Azure brand *logo* files anywhere (license required). Official Azure *architecture icons* are allowed, but **only** inside the architecture diagram (permitted use — see constraint above).

### Architecture diagram (added scope)
- [ ] A "How it works" diagram on the landing showing the runtime path (docs/CONTEXT.md §Runtime Path): browser → Next.js API route (`withCostSafety`, key server-side) → Azure AI Foundry (`gpt-5-mini`, streaming) → back.
- [ ] The Azure node uses the **official Azure AI Foundry architecture icon** (from Mohamed's `Azure_Public_Service_Icons` set), used as-is, with the product name beside it.
- [ ] Non-Azure nodes (browser, Next.js) use neutral styling — no third-party logos.
- [ ] `public/icons/NOTICE.md` records the icon source, the permitted-use terms, and that no logos are used.
- [ ] Accessible: icon has `alt` text; decorative marks are `aria-hidden`.

## Open questions (resolve at start)
- Exact `poweredBy` value per tile — needs Mohamed's confirmation, especially the toggle tiles (MCP, Text Analysis, Speech) that use two paths.
- Custom glyph direction — a single neutral "stack/spark" mark reused everywhere, or per-module variations?

## Notes
- **Editorial-consistent:** JetBrains Mono for the attribution metadata; lean on module accent colours rather than Microsoft blue dominating the page.
- **Data-driven** per CLAUDE.md: `poweredBy` lives in `data/modules.ts`; adjusting attribution is a data edit, not a code change.
- Purely additive UI + one data-schema field — no Azure changes, no cost-safety surface touched.
- Re-verify the brand guidance at ship time (guidelines change; the repo is public).
