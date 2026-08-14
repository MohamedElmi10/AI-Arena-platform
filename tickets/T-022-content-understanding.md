# T-022: Content Understanding (whole tile)

**Status:** open
**Blocked by:** T-020 (reuses/extends `ImageDropzone`)
**Blocks:** T-023
**Module:** Insight Visual Data · **Slug:** `content-understanding`

## Goal
Ship the Content Understanding tile end-to-end: **pick a preset field-set + a sample** (or upload your own), get structured fields back. The teaching point is *one analyzer schema, any modality* — image + single-page document run live; audio + video are pre-analysed samples.

## Phase 1 — Build (Azure + samples)
- [ ] Define **preset analyzers / field-sets** in Foundry inside `rg-ai-arena` (e.g. *Business card* → name/title/company/email; *Invoice* → vendor/total/due-date).
- [ ] Committed **sample inputs** for each preset (an image + a one-page document) under the tile folder — tap-to-load in the UI.
- [ ] `src/app/vision/content-understanding/build.py` — creates/documents the analyzers; runs once over sample **audio + video** to capture their extracted-field JSON, committed as canned results.
- [ ] `README.md` — cost (**pay-per-call, NO free tier**; image ~$0.004, doc ~$0.006/page; audio $0.36/min, video per-minute → why A/V are canned), recreate steps.
- [ ] Endpoint / key → `.env.local` — **NOT committed**.

## Phase 2 — Wire (Next.js + inline UI)
- [ ] Ensure the module route `src/app/vision/[slug]/page.tsx` exists — if this is the first Vision tile to ship, create it (mirrors `agents/[slug]` · `genai/[slug]` · `nl/[slug]`); a live tile 404s without it.
- [ ] `app/api/analyze/content-understanding/route.ts` wrapped in `withCostSafety(...)`; uploads the file server-side, polls the analyzer, returns fields. Unwrapped = fails review.
- [ ] Inline UI — a **preset field-set picker** + **sample gallery** (tap-to-load); **extend `ImageDropzone` → `FileDropzone`** via an `accept` prop (adds PDF/document); build **`ExtractionResult`** (key → value + line-item tables) — build it reusable, T-023 consumes it. Audio/Video show the committed canned results.
- [ ] *Optional / stretch:* a "define your own fields" input — the flashy capability, but presets are the default path; don't gate the demo on it.
- [ ] Image reuses the 1536px / 4MB guard; documents capped to a single page. `data/modules.ts` `guide` added; cost-safety errors → friendly bubble.

- [ ] **Generation feedback:** the `ExtractionResult` panel shows shimmering skeleton rows while the analyzer polls, then the real fields stagger-fade in. Respect `prefers-reduced-motion`.
## Phase 3 — Flip (data)
- [ ] `data/modules.ts` → `content-understanding` → `status: 'live'` (+ `preview`).
- [ ] Landing Live; the Insight Visual Data and global live-counts each increment by one; `/vision/content-understanding` works — preset+sample, own upload, canned A/V.

## Notes
- No free tier — every live call costs a little; keep the caps tight.
- First-page thumbnail only here — full PDF page-rendering belongs to T-023's overlay work.
- On flip, run the **T-018** corpus pass for this tile.
