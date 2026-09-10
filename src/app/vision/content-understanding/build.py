"""
build.py — Content Understanding (AI Arena · Insight Visual Data module)
=======================================================================

Dev-time artifact. NOT called by the running Next.js app — at runtime an
app/api/analyze route calls Content Understanding server-side so the key never
reaches the browser. This script is the SOURCE OF TRUTH for the tile's custom
analyzers: it (re)creates them from code, runs them over the committed samples,
and captures the audio + video results as canned JSON. It lives in the repo as
portfolio surface.

WHAT THIS TILE IS
-----------------
Pick a preset field-set + a sample (or upload your own); the analyzer returns
structured fields. The teaching point is ONE ANALYZER SCHEMA, ANY MODALITY —
the same field-schema mechanism reads a business-card IMAGE and an invoice PDF
live; audio + video are pre-analysed (canned) because they bill per minute.

FOUR PRESETS (one schema each — all built the same way)
  business_card  base prebuilt-document  Name, Title, Company, Email     (image, live)
  invoice        base prebuilt-document  VendorName, InvoiceTotal, DueDate (doc, live)
  call_recording base prebuilt-audio     Summary, Sentiment               (audio, canned)
  product_demo   base prebuilt-video     Summary, Segments[]              (video, canned)

  WHY both live presets share prebuilt-document: CU's document base OCRs the
  card image and the PDF invoice through the identical pipeline — so the same
  field-schema extracts from either. That IS the "any modality" demo, in one
  base analyzer.

FIELD SHAPES (what ExtractionResult renders — T-022 builds it, T-023 reuses it)
  result.contents[0].fields.<Name> -> a ContentField with:
    scalar -> field.value              (str / number / date)
    object -> field.value_object       ({ sub-field: ContentField, ... })
    array  -> field.value              (list of ContentField, each .value_object)
  So the panel is a RECURSIVE renderer: scalar -> row, object -> nested rows,
  array -> table. Empty fields are hidden. (Each field also carries .source, a
  "D(page,x,y,...)" spatial string — that overlay work belongs to T-023.)

COST  (no free tier — every live call bills; keep the caps tight)
  image ~$0.004 / call, document ~$0.006 / page, audio ~$0.36 / min,
  video per-minute. That per-minute A/V cost is why audio + video are canned:
  build.py runs them ONCE, commits the JSON, and the app replays it for free.
  Confirm: https://azure.microsoft.com/pricing/details/content-understanding/

ENV (.env at repo root — gitignored; repo is public)
  CU_ENDPOINT   https://<resource>.services.ai.azure.com/   (Foundry resource)
  CU_KEY        the resource key (optional). If unset, DefaultAzureCredential
                is used (az login + "Cognitive Services User" role) — the same
                AAD path the runtime route should prefer, since keys are
                test-only per the SDK docs.
  CU_COMPLETION_MODEL   completion deployment  (default gpt-4.1)
  CU_EMBEDDING_MODEL    embedding deployment   (default text-embedding-3-large)

RUN
  pip install azure-ai-contentunderstanding azure-identity azure-core python-dotenv
  python src/app/vision/content-understanding/build.py
  (creates the 4 analyzers if missing, analyzes ./samples/*, prints the live
   fields, writes ./canned/{call_recording,product_demo}.json, and deletes the
   two ephemeral A/V analyzers so nothing lingers.)
"""

import json
import os
import pathlib

from dotenv import load_dotenv
from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import ResourceExistsError, ResourceNotFoundError
from azure.ai.contentunderstanding import ContentUnderstandingClient
from azure.ai.contentunderstanding.models import (
    AnalysisResult,
    ContentAnalyzer,
    ContentFieldDefinition,
    ContentFieldSchema,
    ContentFieldType,
    GenerationMethod,
)

load_dotenv()

TILE_DIR = pathlib.Path(__file__).parent
SAMPLES_DIR = TILE_DIR / "samples"
CANNED_DIR = TILE_DIR / "canned"

COMPLETION_MODEL = os.getenv("CU_COMPLETION_MODEL", "gpt-4.1")
EMBEDDING_MODEL = os.getenv("CU_EMBEDDING_MODEL", "text-embedding-3-large")


def make_client():
    endpoint = os.environ["CU_ENDPOINT"]
    key = os.getenv("CU_KEY")
    if key:
        credential = AzureKeyCredential(key)
    else:
        from azure.identity import DefaultAzureCredential

        credential = DefaultAzureCredential()
    # api_version pinned to the GA service version the 1.x SDK targets.
    return ContentUnderstandingClient(
        endpoint=endpoint, credential=credential, api_version="2025-11-01"
    )


def s(desc, method=GenerationMethod.EXTRACT):
    """A simple string field — the common case for these presets."""
    return ContentFieldDefinition(
        type=ContentFieldType.STRING, method=method, description=desc
    )


def n(desc):
    """A number field (extracted)."""
    return ContentFieldDefinition(
        type=ContentFieldType.NUMBER, method=GenerationMethod.EXTRACT, description=desc
    )


# --- Analyzer definitions (this file is their source of truth) --------------
# base analyzer -> which prebuilt pipeline reads the file; field_schema -> what
# we pull out. models is REQUIRED for field_schema on the document base.
DOC_MODELS = {"completion": COMPLETION_MODEL, "embedding": EMBEDDING_MODEL}
AV_MODELS = {"completion": COMPLETION_MODEL}

PRESETS = {
    # id, live?, base analyzer, sample file, field schema
    "business_card": dict(
        live=True,
        base="prebuilt-document",
        sample="business-card.png",
        models=DOC_MODELS,
        schema=ContentFieldSchema(
            name="business_card_schema",
            description="Contact details from a business card.",
            fields={
                "Name": s("Full name of the card holder"),
                "Title": s("Job title / role"),
                "Company": s("Company or organization name"),
                "Email": s("Email address"),
                "Phone": s("Phone number"),
                "Address": s("Postal / mailing address"),
            },
        ),
    ),
    "invoice": dict(
        live=True,
        base="prebuilt-document",
        sample="invoice.png",
        models=DOC_MODELS,
        schema=ContentFieldSchema(
            name="invoice_schema",
            description="Key fields from a single-page invoice.",
            fields={
                "VendorName": s("Name of the vendor / supplier issuing the invoice"),
                "CustomerName": s("Name of the customer / bill-to party"),
                "InvoiceId": s("Invoice number or ID"),
                "InvoiceDate": ContentFieldDefinition(
                    type=ContentFieldType.DATE,
                    method=GenerationMethod.EXTRACT,
                    description="Date the invoice was issued",
                ),
                "DueDate": ContentFieldDefinition(
                    type=ContentFieldType.DATE,
                    method=GenerationMethod.EXTRACT,
                    description="Payment due date",
                ),
                "SubTotal": n("Subtotal before tax"),
                "Tax": n("Tax amount"),
                "InvoiceTotal": n("Grand total amount due"),
                "Items": ContentFieldDefinition(
                    type=ContentFieldType.ARRAY,
                    description="Line items on the invoice",
                    item_definition=ContentFieldDefinition(
                        type=ContentFieldType.OBJECT,
                        properties={
                            "Description": s("What the line item is"),
                            "Quantity": n("Quantity"),
                            "UnitPrice": n("Price per unit"),
                            "Amount": n("Line total"),
                        },
                    ),
                ),
            },
        ),
    ),
    "call_recording": dict(
        live=False,
        base="prebuilt-audio",
        sample="audio.mp3",
        models=AV_MODELS,
        schema=ContentFieldSchema(
            name="call_recording_schema",
            description="Summary + sentiment of a support call.",
            fields={
                "Summary": s("One-paragraph summary of the call", GenerationMethod.GENERATE),
                "Sentiment": ContentFieldDefinition(
                    type=ContentFieldType.STRING,
                    method=GenerationMethod.CLASSIFY,
                    description="Overall caller sentiment",
                    enum=["Positive", "Neutral", "Negative"],
                ),
            },
        ),
    ),
    "product_demo": dict(
        live=False,
        base="prebuilt-video",
        sample="video.mp4",
        models=AV_MODELS,
        schema=ContentFieldSchema(
            name="product_demo_schema",
            description="Segment-by-segment summary of a demo video.",
            fields={
                "Summary": s("One-paragraph summary of the whole video", GenerationMethod.GENERATE),
                "Segments": ContentFieldDefinition(
                    type=ContentFieldType.ARRAY,
                    description="Notable segments",
                    item_definition=ContentFieldDefinition(
                        type=ContentFieldType.OBJECT,
                        properties={
                            "Description": s("What happens in this segment", GenerationMethod.GENERATE),
                        },
                    ),
                ),
            },
        ),
    ),
}


def ensure_analyzer(client, analyzer_id, preset):
    """(Re)create the analyzer from its code definition. This file is the source
    of truth, so a schema edit here takes effect on the next run — delete-then-
    create keeps that simple, and creation is free (only analysis bills)."""
    try:
        client.delete_analyzer(analyzer_id=analyzer_id)
        print(f"[replace] {analyzer_id} — recreating with the current schema")
    except ResourceNotFoundError:
        pass
    analyzer = ContentAnalyzer(
        base_analyzer_id=preset["base"],
        description=f"AI Arena · {analyzer_id}",
        field_schema=preset["schema"],
        models=preset["models"],
    )
    client.begin_create_analyzer(analyzer_id=analyzer_id, resource=analyzer).result()
    print(f"[new]  {analyzer_id} created (base {preset['base']})")


def to_plain(field):
    """ContentField -> plain JSON (what ExtractionResult consumes).
    scalar -> value; object -> {sub: value}; array -> [ ... ]."""
    obj = getattr(field, "value_object", None)
    if obj:
        return {k: to_plain(v) for k, v in obj.items()}
    val = getattr(field, "value", None)
    if isinstance(val, list):
        return [to_plain(v) for v in val]
    return val


def fields_to_json(result: AnalysisResult):
    if not result.contents:
        return {}
    fields = result.contents[0].fields or {}
    return {name: to_plain(f) for name, f in fields.items()}


def analyze_sample(client, analyzer_id, sample_path):
    """Run one analyzer over one committed local sample (image / doc / a/v)."""
    poller = client.begin_analyze_binary(
        analyzer_id=analyzer_id, binary_input=sample_path.read_bytes()
    )
    return poller.result()


def main():
    client = make_client()
    CANNED_DIR.mkdir(exist_ok=True)

    for analyzer_id, preset in PRESETS.items():
        sample = SAMPLES_DIR / preset["sample"]
        if not sample.exists():
            print(f"[skip] {analyzer_id}: drop a sample at {sample}")
            continue

        # A/V bills per minute — if we already captured it, leave it alone so
        # re-runs (e.g. to update a live schema) stay cheap. Delete the JSON to
        # force a re-capture.
        if not preset["live"]:
            cached = CANNED_DIR / f"{analyzer_id}.json"
            if cached.exists():
                print(f"[cached] {analyzer_id}: {cached.name} exists — skipping")
                continue

        ensure_analyzer(client, analyzer_id, preset)

        try:
            result = analyze_sample(client, analyzer_id, sample)
        except Exception as exc:
            print(f"[fail] {analyzer_id}: {type(exc).__name__}: {exc}")
            continue

        data = fields_to_json(result)

        if preset["live"]:
            # Live presets: just show the fields — the app calls them at runtime.
            print(f"\n=== {analyzer_id} · {sample.name} (live) ===")
            for name, value in data.items():
                print(f"  {name:<16} {str(value)[:48]}")
        else:
            # A/V presets: capture ONCE, commit the JSON, then delete the
            # analyzer so the pay-per-minute resource doesn't linger.
            out = CANNED_DIR / f"{analyzer_id}.json"
            out.write_text(json.dumps(data, indent=2, default=str))
            print(f"\n=== {analyzer_id} · {sample.name} (canned) -> {out.name} ===")
            client.delete_analyzer(analyzer_id=analyzer_id)
            print(f"  captured {len(data)} fields; deleted {analyzer_id}")


if __name__ == "__main__":
    main()
