# Content Understanding

*Insight Visual Data module · slug `content-understanding` · ticket T-022*

**One analyzer schema, any modality.** Pick a preset field-set and a sample —
or upload your own — and the analyzer returns structured fields. A business-card
**image** and an invoice **PDF** run live through the *same* field-schema
mechanism; **audio + video** are pre-analysed (canned) because they bill per
minute.

## The four presets

| Preset | Base analyzer | Fields | How it runs |
| --- | --- | --- | --- |
| `business_card` | `prebuilt-document` | Name, Title, Company, Email | live (image) |
| `invoice` | `prebuilt-document` | VendorName, InvoiceTotal, DueDate | live (single-page doc) |
| `call_recording` | `prebuilt-audio` | Summary, Sentiment | canned (audio) |
| `product_demo` | `prebuilt-video` | Summary, Segments[] | canned (video) |

Both live presets sit on `prebuilt-document` on purpose: CU's document base OCRs
the card image and the PDF invoice through the identical pipeline, so one
field-schema reads either. That's the "any modality" claim, demonstrated in a
single base analyzer.

## Field shapes (what `ExtractionResult` renders)

`result.contents[0].fields.<Name>` is a `ContentField`:

- **scalar** → `field.value` (str / number / date) → one row
- **object** → `field.value_object` (`{ sub-field: ContentField }`) → nested rows
- **array** → `field.value` (list of `ContentField`, each `.value_object`) → a table

So the panel is a **recursive** renderer; empty fields are hidden. `ExtractionResult`
is built here (T-022) and reused by Document Intelligence (T-023). Each field also
carries a `source` string like `D(1,2.1,3.4,…)` — the spatial overlay that uses it
is T-023's job, not this tile's.

## Cost — no free tier

Every live call bills: image ~$0.004, document ~$0.006/page, audio ~$0.36/min,
video per-minute. The per-minute A/V cost is why `call_recording` and
`product_demo` are **canned** — `build.py` runs them once, commits the JSON under
`canned/`, and the app replays it for free. Keep the runtime cost caps tight
(`withCostSafety`). Confirm current pricing:
<https://azure.microsoft.com/pricing/details/content-understanding/>

## Recreate

`build.py` is the source of truth for the analyzers — it (re)creates them from
code, so the repo defines them, not the Studio.

```bash
pip install azure-ai-contentunderstanding azure-identity azure-core python-dotenv
```

Env (in `.env` at the repo root — gitignored; the repo is public):

```
CU_ENDPOINT=https://<resource>.services.ai.azure.com/   # Foundry resource
CU_KEY=<resource-key>                                   # optional; omit -> DefaultAzureCredential
CU_COMPLETION_MODEL=gpt-4.1                              # optional (default)
CU_EMBEDDING_MODEL=text-embedding-3-large               # optional (default)
```

`CU_KEY` is optional: leave it out and the script (and, later, the runtime route)
use `DefaultAzureCredential` — `az login` + the **Cognitive Services User** role
on the resource. That AAD path is preferred; keys are test-only per the SDK docs.

Drop the samples, then run:

```
samples/business-card.png   samples/invoice.pdf
samples/audio.mp3           samples/video.mp4
```

```bash
python src/app/vision/content-understanding/build.py
```

It creates any missing analyzer, analyzes each sample, prints the two live
field-sets, writes `canned/call_recording.json` + `canned/product_demo.json`, and
deletes the two ephemeral A/V analyzers so the pay-per-minute resource doesn't
linger.

## Runtime (Phase 2)

`app/api/analyze/content-understanding/route.ts`, wrapped in `withCostSafety(...)`,
uploads the file server-side and polls the `business_card` / `invoice` analyzer;
audio + video serve the committed `canned/*.json`. Keys never reach the browser.
