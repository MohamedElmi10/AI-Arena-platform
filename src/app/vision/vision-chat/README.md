# Vision Chat

Tile #1 in AI Arena's **Insight Visual Data** module. Show it a picture, ask
about it, get an answer grounded in the pixels.

## What it is

One model doing three jobs that used to be three different products:

| | Ask | What it proves |
|---|---|---|
| **describe** | "What is in this picture?" | It sees the subject |
| **read** | "Transcribe every word, then translate it" | It reads text — no OCR service involved |
| **reason** | "Which month fell the most, and by how much?" | It judges what it sees, not just labels it |

The third one is why this tile is not a wrapper over OCR. Describing and
transcribing are things the old Azure Vision APIs did. Comparing two bars on a
chart and telling you which dropped is not.

`build.py` runs all three against committed samples, plus a fourth option for any
image on your disk.

## One image per job

Three samples, one each. This is not tidiness — a picture cannot serve all three.
Asking the dragon-fruit photo to *"transcribe every word you can see"* gets a
correct answer ("there are no words") that reads as a broken demo.

Image and prompt live together in one dict in `build.py`, so the pairing cannot
drift. The tile's suggested prompts come from the same place.

## Cost — measured, and not what was planned

The ticket assumed images would be expensive and that resizing them in the
browser would be the cost control. Both wrong.

Same picture, two resolutions, same question:

| file | pixels | on disk | input tokens | first token |
|---|---|---|---|---|
| `big.jpg` | 4096px | 1.4 MB | **753** | 4.0s |
| `small.jpg` | 1536px | 376 KB | **753** | 3.0s |

Identical. Azure normalises the image before it charges, so above its threshold,
resolution is free. Other samples landed at 1,049 (1280×906) and 1,300 (a phone
photo) — one band, roughly 750–1,300 input tokens whatever you send.

Two things follow:

- **The browser resize survives, for a different reason.** It buys about a second
  of latency and a much smaller upload, which matters on a phone. It is not a
  spend control and the copy should not claim it is.
- **The bill scales with messages, not megapixels.** So the real bounds are the
  daily budget key and the history policy — whether the image is re-sent on every
  turn of a conversation.

A number from the Foundry portal (5,224 tokens for a 1024px image) was portal
overhead, not the picture. Measure through your own code before believing a
playground.

## Latency is the real constraint

3–4 seconds before the first token, every time, because the model reads the whole
image before it says anything. That gap does not shrink much with a smaller
picture, so the UI has to fill it rather than optimise it away — hence the
"reading the image…" indicator in Phase 2.

## Auth — this tile uses a key

The agent tiles authenticate keyless (`az login` → `DefaultAzureCredential`)
because the Foundry agent endpoint accepts it. This tile talks to the Azure OpenAI
endpoint, which in this repo has always used `AZURE_OPENAI_API_KEY` — the same
credential `getFoundryClient()` uses at runtime. `build.py` matching the route is
the point, not an inconsistency.

Trying keyless here returns `401 invalid_issuer`, which is a token-audience
mismatch, not a permissions problem.

## Two traps worth keeping

**The endpoint must end in `/openai/v1/`.** The `OpenAI` SDK appends its paths
onto `base_url`. Stop at the hostname and every call 404s with "Resource not
found", which sounds like a missing deployment.

**File extensions lie.** One sample here was a PNG named `.jpeg`. `to_data_url`
reads the suffix, so it announced `image/jpeg` for PNG bytes — it worked only
because Azure sniffs the real format. Phase 2 accepts uploads from strangers, so
the route should check the bytes rather than trust the name.

## Environment

Repo-root `.env`, gitignored:

```
AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com/openai/v1/
AZURE_OPENAI_API_KEY=<key 1>
MODEL_ENDPOINT=gpt-5-mini
```

Nothing new — all three already existed for the chat tiles.

## Run it

```
source .venv/bin/activate
pip install openai python-dotenv
python3 src/app/vision/vision-chat/build.py
```

Then A, B, C for the samples, or D for any image on disk.

## Redeploy

Nothing to redeploy. No agent, no index, no second resource — just a model
deployment that already exists. Delete `rg-ai-arena` and redeploy `gpt-5-mini` to
get back to zero.

## Reference

- [Use vision-enabled chat models](https://learn.microsoft.com/azure/foundry/openai/how-to/gpt-with-vision)
- [Vision-enabled chat model concepts](https://learn.microsoft.com/azure/ai-foundry/openai/concepts/gpt-with-vision) — 20 MB per image, 10 images per call
- [Reasoning models — feature support](https://learn.microsoft.com/azure/foundry/openai/how-to/reasoning) — confirms gpt-5-mini takes image input
