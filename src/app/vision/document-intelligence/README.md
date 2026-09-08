# Document Intelligence

The closing tile of the **Insight Visual Data** module: upload a receipt, invoice,
or ID (or pick a sample) and watch each field get **boxed on the page** — extraction
with exact spatial layout, not just values.

## What it is

Three Azure **prebuilt models** — no training:

| Type | Model | Sample fields |
| --- | --- | --- |
| Receipt | `prebuilt-receipt` | MerchantName, Total, Subtotal, TransactionDate, Items[] |
| Invoice | `prebuilt-invoice` | InvoiceId, VendorName, InvoiceTotal, DueDate, Items[] |
| ID | `prebuilt-idDocument` | FirstName, LastName, DateOfBirth, DocumentNumber |

Each extracted field carries a **polygon** (`documents[0].fields.<Name>.boundingRegions[].polygon`
— 4 corners), which the tile draws over the image. Hover a field row and its box
highlights, and vice-versa.

`build.py` in this folder is the dev-time script: it runs each model over a sample
and prints the fields + boxes. The running app never calls it — a Next.js route
calls the service server-side so the key never reaches the browser.

### The overlay's one hard rule: scale by the page's own units

The polygon coordinate space is **not always pixels**:

- **Image** input → `pages[0].unit == "pixel"` (e.g. 1982 × 2520)
- **PDF** input → `pages[0].unit == "inch"` (e.g. 8.5 × 11)

So `AnnotationOverlay` scales every polygon by `renderedWidth / pages[0].width`
and `renderedHeight / pages[0].height`, reading `width`/`height`/`unit` straight
from the result — never hardcoding pixels. The tile is **image-only** (no PDF
renderer), so committed samples are `.png`/`.jpg` and units come back as pixel;
the generic scaling is cheap insurance.

Value types differ per field — `valueString`, `valueDate`, `valueNumber`,
`valueCurrency {amount, currencyCode}`, `valueAddress {...}` — so the field panel
formats each. Some fields have **no** `boundingRegions` (derived) → shown without a
box. `Items`/`TaxDetails` are nested arrays whose sub-fields have their own boxes.
ID results also include `styles[].isHandwritten` (the signature) and lower
confidences — surface confidence in the UI.

## Cost — pay-per-page, no idle billing

**F0 free tier: 500 pages/month.** If a model isn't on F0, **S0** is the fallback:
~$1.50 per 1,000 pages, billed per page only — an idle resource costs nothing, so
no ADR gate is needed (unlike the always-warm concerns elsewhere). Confirm current
pricing on the
[Document Intelligence pricing page](https://azure.microsoft.com/pricing/details/ai-document-intelligence/).

Azure allows **one F0 Document Intelligence resource per subscription**.

The Next.js route still wraps the handler in `withCostSafety(...)` (ADR-0001) for
the kill switch + daily cap, and renders an Azure **429** from F0's rate limit
distinctly from the cost-safety 429.

## Environment

`build.py` reads two values from `.env` at the repo root (gitignored — **never
committed**; the repo is public):

```
DOCINTEL_ENDPOINT=https://<your-resource>.cognitiveservices.azure.com/
DOCINTEL_KEY=<your-key>
```

Both are on the resource's **Keys and Endpoint** page in the Azure portal.

## Run it

```
python -m venv .venv && source .venv/bin/activate
pip install azure-ai-documentintelligence azure-core python-dotenv
python src/app/vision/document-intelligence/build.py
```

Drop sample images in `./samples/` as `receipt.png`, `invoice.png`, `id.png`
first. The script prints each model's fields, values, confidence, and whether a
box is present.

## How to redeploy (if the resource is deleted)

1. Azure Portal → **Create a resource** → **Document Intelligence** → in
   `rg-ai-arena`, region Sweden Central (or any with F0), pricing tier **Free F0**.
2. Copy **endpoint + key** from *Keys and Endpoint* into `.env` (see above).
3. `python build.py` to confirm all three models run.

## Reference

[Document Intelligence prebuilt models](https://learn.microsoft.com/azure/ai-services/document-intelligence/overview)
