# T-023: Document Intelligence (whole tile)

**Status:** done
**Blocked by:** T-020 (`ImageDropzone`), T-022 (`ExtractionResult`)
**Blocks:** —
**Module:** Insight Visual Data · **Slug:** `document-intelligence`

## Goal
Ship the Document Intelligence tile end-to-end: **pick a document type + a sample** (or upload a document image); extract fields **and box each one on the page**, with hover-linking between the field list and the boxes. Closes the Insight Visual Data module.

## Phase 1 — Build (Azure + samples)
- [x] Document Intelligence resource in `rg-ai-arena` on the **F0 free tier** (500 pages/mo).
- [x] Support **2–3 prebuilt models: Receipt · Invoice · ID card** (confirm which are on F0; any that aren't → S0, still pay-per-page, no idle billing → no ADR).
- [x] Committed **sample document images** for each type — tap-to-load in the UI.
- [x] `src/app/vision/document-intelligence/build.py` — calls each prebuilt model over a sample, showing fields + `boundingRegions`.
- [x] `README.md` — cost (F0 free 500 pages/mo; S0 fallback ~$1.50/1000; no idle billing), redeploy steps.
- [x] Endpoint / key → `.env.local` — **NOT committed**.

## Phase 2 — Wire (Next.js + inline UI)
- [x] Ensure the module route `src/app/vision/[slug]/page.tsx` exists — if this is the first Vision tile to ship, create it (mirrors `agents/[slug]` · `genai/[slug]` · `nl/[slug]`); a live tile 404s without it.
- [x] `app/api/analyze/document-intelligence/route.ts` wrapped in `withCostSafety(...)`; sends the image, polls, returns fields + `boundingRegions`. Unwrapped = fails review.
- [x] Inline UI — a **doc-type picker** (Receipt / Invoice / ID) + **sample gallery**; reuse **`ImageDropzone`** (T-020, full 1536px) → build **`AnnotationOverlay`** (boxes over the image, scaled to render size, two-way hover-highlight with the **`ExtractionResult`** side panel from T-022).
- [x] Single-page / image input; friendly errors (an Azure 429 from F0's rate limit rendered distinctly from the cost-safety 429). `data/modules.ts` `guide` added.

- [x] **Generation feedback:** an “analysing…” shimmer over the document while polling; on result, the bounding boxes draw/fade in and the field rows populate. Respect `prefers-reduced-motion`.
## Phase 3 — Flip (data)
- [x] `data/modules.ts` → `document-intelligence` → `status: 'live'` (+ `preview`).
- [x] Landing Live; the module now reads `4 / 4`; the overlay + hover-linking work end-to-end.

## Notes
- **Image-input only** — no PDF renderer. A pdf.js (free/OSS) page-render is a later follow-up ticket if wanted.
- Reuses `ImageDropzone` (T-020) and `ExtractionResult` (T-022); the new component here is `AnnotationOverlay` — the module's showpiece.
- On flip, run the **T-018** corpus pass — the module is now fully Live.
