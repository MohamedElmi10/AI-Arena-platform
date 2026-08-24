# T-025: Speech Assistant (whole tile)

**Status:** open
**Blocked by:** — (needs [ADR-0003](../docs/adr/0003-speech-cost-posture.md) merged first)
**Blocks:** —
**Module:** Natural Language · **Slug:** `speech-assistant`

## Goal
Ship the Natural Language pillar's second tile: a **speech-capable** demo built
directly on the Speech SDK — speech to text, text to speech with SSML, and
one-call speech translation.

## ⚠️ Scope change before you start — read this first

`data/modules.ts` currently promises:

> "A speech-capable gen-AI app **plus a Speech agent via the Azure Speech MCP
> server**. Toggle implementations."

**Drop the MCP half.** The Azure Speech MCP Server is real — it's in the Foundry
tool catalog and you attach it the same way the Text Analysis Agent attaches
Azure Language. But it carries three blockers this project can't absorb:

1. **It requires the Agent Service Enterprise tier.** Connecting it on a
   non-Enterprise resource fails with
   `Invalid tool value(s): mcp. Use the Enterprise offerings to access these tool(s)`.
   Per CLAUDE.md, a paid-tier resource needs a **new ADR** before provisioning.
2. **It requires an Azure Storage account and SAS URLs** for both input audio and
   output audio. That is a second provisioned resource plus secret-handling the
   cost-safety posture doesn't currently cover.
3. **It authenticates with a raw API key** (`Bearer` = `KEY1`/`KEY2`) pasted into
   the tool config — not managed identity, unlike every other tile.

It is also **not a live speech app**: audio has to be a blob with a SAS URL, so
you can't stream a microphone into it. It answers "transcribe the file at this
URL", which is a weaker demo than the SDK route.

T-024 already shipped one wiring after promising a toggle. **Don't repeat that.**
Promise one wiring, ship one wiring, and update `desc`/`tag`/`guide` in
`data/modules.ts` and `docs/CONTEXT.md` so nothing claims what isn't built. If the
MCP route is wanted later it's a separate ticket **plus an ADR**.

Source: [Connect Azure Speech in Foundry Tools to an agent](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/azure-ai-speech)

## ⚠️ Cost posture — settled in ADR-0003, don't re-decide it here

An earlier draft of this ticket said F0 free tier, no new ADR needed. That was
wrong on both counts and [ADR-0003](../docs/adr/0003-speech-cost-posture.md) now
supersedes it. The short version:

- **S0 (paid), not F0.** F0 can't bill you, but its concurrent request limit is 1
  and isn't adjustable — the second simultaneous visitor gets a 429. A tile that
  breaks when two people open it is worse than a small bill.
- **`withCostSafety(...)` alone is not enough here.** It bounds `max_output_tokens`,
  which is the wrong unit: speech bills per audio second in and per character out.
  Wrapping the route satisfies ADR-0001's letter while leaving the real cost lever
  unbounded.
- The two caps below are the speech equivalent of `max_output_tokens`. They are
  acceptance items, not polish.

## Phase 1 — Build (Azure)

- [ ] Create a **standalone Azure Speech resource** in `rg-ai-arena` on the
      **S0 tier**, per ADR-0003. **Do not reuse the Foundry resource** — Foundry
      has no F0 path, provisions Speech at S0 anyway, and mixing them makes the
      Speech line item unreadable on the bill.
- [ ] `pip install azure-cognitiveservices-speech`
- [ ] Env in `.env.local` (never committed):
      `SPEECH_KEY`, `SPEECH_REGION`, and `LEXICON_URI` for Part B.
- [ ] **Write** `src/app/nl/speech-assistant/build.py` — the folder doesn't exist
      yet. Scaffold it TODO-style like the other tiles (nudges, not solutions) and
      fill it in yourself; that's the point of the tile.
- [ ] Upload the custom lexicon XML somewhere publicly readable (a raw GitHub URL
      is free and avoids a storage account — prefer it over Blob + SAS). Commit the
      lexicon file itself to the tile folder as portfolio surface.
- [ ] `README.md` next to `build.py` — what it is, **cost model per ADR-0003**,
      redeploy.
- [ ] **No custom speech model and no custom neural voice.** Both are hourly-billed
      custom endpoints (CONTEXT.md §Provisioned) and each would need its own ADR.
      The table below is exam knowledge for the README — not a build instruction.

## Phase 2 — Wire (Next.js + inline UI)

- [ ] Route wrapped in `withCostSafety(handler, { limit: 100, key: "speech" })`
      — the dedicated budget key from ADR-0003, not the global chat budget.
- [ ] **`MAX_AUDIO_SECONDS = 30`** — reject longer uploads. Checked **before** the
      Speech client is constructed, so a rejection costs nothing.
- [ ] **`MAX_SYNTHESIS_CHARS = 800`** — reject longer synthesis input, same
      placement.
- [ ] Both rejections return a friendly bubble that reads as a designed boundary
      ("this demo listens for 30 seconds at a time"), not an error.
- [ ] Speech keys never reach the browser (ADR-0001).
- [ ] Decide the browser story before writing UI. Two options:
      - **Simplest:** browser records audio → POST to the route → server calls
        Speech → return transcript/audio. One round trip, no browser SDK, keys
        stay server-side. **Recommended.**
      - **Live:** issue a short-lived Speech **authorization token** from the route
        and let the browser SDK stream. Better demo, more moving parts, and the
        token is still a credential in the browser.
- [ ] **Decide the UI shell — this is not a free choice.** `Playground.tsx`
      hardcodes `fetch('/api/chat/${tile.slug}')`, so a route at
      `app/api/speech/speech-assistant/` is unreachable from the shared Playground.
      Pick one and write it down:
      - **Reuse `Playground`** — keep the route at `app/api/chat/speech-assistant/`
        (consistent with all five live tiles) and teach `ChatSurface` an audio
        input. Keeps the guide pane, `LiveStats`, the cost-safety friendly-error
        path, and the SSE parser. **Recommended** — "consistency over novelty".
      - **Bespoke page** — a standalone speech UI. Then say so out loud, and note
        that the `guide` field below renders nowhere unless it's wired by hand.
- [ ] `data/modules.ts` `guide` added (greeting / about / tryThis / expect).

## Phase 3 — Flip (data)

- [ ] `data/modules.ts` → NL → `speech-assistant` → `status: 'live'` (+ `preview`).
- [ ] Fix the tile `tag` and `desc` to match what shipped (no "MCP", no "toggle").
- [ ] `docs/CONTEXT.md` — tile 10 in the tile map still says "**toggle**: speech-capable
      gen-AI app vs. Speech MCP agent". Fix it, and link ADR-0003 from §Cost Safety
      the way tile 13 links ADR-0002.
- [ ] Run the **T-018** corpus pass. Note it inherits T-024's unpaid debt —
      `corpus/05-modules-and-tiles.md` still calls the Text Analysis tile a
      "toggle" too. Fix both in the same pass.

## Why this tile is built this way

The AI-103 retake weak areas are monitoring, responsible AI, and **speech**. On a
Speech-filtered drill run on 2026-08-24 the score was **1/7**, and the misses were
not random — they clustered on **which side of the service you customise**:

| Confusion | Recognition side (STT) | Synthesis side (TTS) |
|---|---|---|
| Fix vocabulary the model mis-hears | **custom speech model**, phrase list | — |
| Fix how a word is spoken aloud | — | **custom lexicon** + SSML, `phoneme`, `sub` |
| Make a new voice | — | **custom neural voice** (needs voice talent + approval) |

Parts B and C of `build.py` exist to make that boundary physical. Build it once
and the exam question stops being a coin flip. Note that only the **custom lexicon**
row is actually built here — the other two are provisioned endpoints (see Phase 1).

## Notes

- Speech translation is **one** `TranslationRecognizer` — source language, target
  language, synthesis voice, done. It is *not* STT → Translator → TTS chained by
  hand. Part C exists so the "least development effort" answer is something you've
  felt in your fingers rather than memorised.
- Translation bills per audio hour at a higher rate than plain transcription, but
  it *replaces* the STT call rather than adding to it, and the same
  `MAX_AUDIO_SECONDS` cap bounds it.
- **Deploy (T-009):** Netlify needs `SPEECH_KEY`, `SPEECH_REGION` and
  `LEXICON_URI` set, same as the other tiles' env.
