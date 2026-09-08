"""
build.py — Document Intelligence (AI Arena · Insight Visual Data module)
=======================================================================

Dev-time artifact. NOT called by the running Next.js app — at runtime an
app/api/analyze route calls Document Intelligence server-side so the key never
reaches the browser. This script is how each prebuilt model was tried and how
the tile's sample outputs were captured; it lives in the repo as portfolio
surface.

WHAT THIS TILE IS
-----------------
Pick a document type (Receipt / Invoice / ID) + a sample (or upload an image);
the model extracts the fields AND returns a box (polygon) for each one, which
the tile draws over the page — hover a field, its box highlights.

THREE PREBUILT MODELS
  receipt  -> prebuilt-receipt     MerchantName, Total, Subtotal, TransactionDate, Items[]...
  invoice  -> prebuilt-invoice     InvoiceId, VendorName, InvoiceTotal, DueDate, Items[]...
  id       -> prebuilt-idDocument  FirstName, LastName, DateOfBirth, DocumentNumber...

THE BOXES  (the tile's showpiece — AnnotationOverlay)
  Each field: documents[0].fields.<Name>.boundingRegions[].polygon
  = 8 numbers, 4 corners [x1,y1, x2,y2, x3,y3, x4,y4].

  GOTCHA — the coordinate unit differs per document:
    image input -> pages[0].unit == "pixel"  (e.g. 1982 x 2520)
    PDF input   -> pages[0].unit == "inch"    (e.g. 8.5 x 11)
  So the overlay must scale every polygon by (renderedW / pages[0].width,
  renderedH / pages[0].height) in THAT page's unit — never hardcode pixels.
  The tile is IMAGE-ONLY (no PDF renderer) so its samples are png/jpg -> pixel,
  but reading width/height/unit generically costs nothing and is future-proof.

  Value types vary: valueString, valueDate, valueNumber, valueCurrency
  {amount, currencyCode}, valueAddress {...}. Some fields have NO boundingRegions
  (derived) -> list them without a box. Items/TaxDetails are nested arrays whose
  sub-fields carry their own boxes. ID adds styles[].isHandwritten (the signature)
  and generally lower confidences — surface confidence in the UI.

COST  (no ADR needed — no idle billing)
  F0 free tier: 500 pages/month. S0 fallback: ~$1.50 / 1000 pages, billed per
  page only; an idle resource costs nothing.
  Confirm: https://azure.microsoft.com/pricing/details/ai-document-intelligence/

ENV (.env at repo root — gitignored; repo is public)
  DOCINTEL_ENDPOINT   https://<resource>.cognitiveservices.azure.com/
  DOCINTEL_KEY        the resource key (portal -> Keys and Endpoint)

RUN
  pip install azure-ai-documentintelligence azure-core python-dotenv
  python src/app/vision/document-intelligence/build.py
  (analyzes ./samples/<type>.png for each model and prints fields + boxes)
"""

import os
import pathlib

from dotenv import load_dotenv
from azure.core.credentials import AzureKeyCredential
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest, AnalyzeResult

load_dotenv()

client = DocumentIntelligenceClient(
    endpoint=os.environ["DOCINTEL_ENDPOINT"],
    credential=AzureKeyCredential(os.environ["DOCINTEL_KEY"]),
)

SAMPLES_DIR = pathlib.Path(__file__).parent / "samples"

# doc type -> (prebuilt model id, committed sample image). Image-only: png/jpg.
MODELS = {
    "receipt": ("prebuilt-receipt", "receipt.png"),
    "invoice": ("prebuilt-invoice", "invoice.png"),
    "id": ("prebuilt-idDocument", "id.png"),
}


def field_value(field):
    """The displayable value across the types the three models return."""
    for key in ("valueString", "valueDate", "valueNumber", "valueTime", "content"):
        v = field.get(key)
        if v is not None:
            return v
    cur = field.get("valueCurrency")
    if cur:
        return f"{cur.get('currencySymbol', '')}{cur.get('amount')} {cur.get('currencyCode', '')}".strip()
    addr = field.get("valueAddress")
    if addr:
        return addr.get("streetAddress") or str(addr)
    return "—"


def analyze(model_id, sample_path):
    """Run one prebuilt model over one sample and print fields + their boxes —
    exactly the data the tile's overlay (boxes) and panel (values) consume."""
    poller = client.begin_analyze_document(
        model_id, AnalyzeDocumentRequest(bytes_source=sample_path.read_bytes())
    )
    result: AnalyzeResult = poller.result()

    page = result.pages[0]
    print(f"\n=== {model_id} · {sample_path.name} ===")
    print(f"page {page.width} x {page.height} {page.unit}  "
          f"(scale polygons by rendered-size / this, in {page.unit})")

    for doc in result.documents or []:
        for name, field in (doc.fields or {}).items():
            regions = field.get("boundingRegions") or []
            box = "box" if regions else "no-box"
            conf = field.get("confidence")
            print(f"  {name:<24} {str(field_value(field))[:38]:<40} conf={conf}  {box}")


def main():
    for kind, (model_id, sample) in MODELS.items():
        path = SAMPLES_DIR / sample
        if not path.exists():
            print(f"[skip] {kind}: drop a sample image at {path}")
            continue
        try:
            analyze(model_id, path)
        except Exception as exc:
            print(f"[fail] {kind}: {type(exc).__name__}: {exc}")


if __name__ == "__main__":
    main()
