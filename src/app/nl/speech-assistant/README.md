# Speech Assistant

Tile #2 in AI Arena's **Natural Language** module, after the
[Text Analysis Agent](../text-analysis-agent/). The first tile in the project that
isn't a Foundry-hosted agent at all — it talks to Azure Speech directly through
the Speech SDK.

## What it is

One Azure Speech resource with two independent halves, and almost every mistake
on this topic comes from confusing them:

- **The ear** — speech to text. Audio in, a string out. This half decides *what
  was said*.
- **The mouth** — text to speech. A string in, audio out. This half decides *how
  it sounds*.

`build.py` exercises both, plus a third mode that collapses them into one call.
Run it and pick a letter:

| | |
|---|---|
| **A** | speak, see the text |
| **B** | plain text, no lexicon |
| **C** | SSML + custom lexicon |
| **D** | speak English, hear Swedish |

## The customisation boundary

The reason this tile exists in this shape. Both of these fix a pronunciation
problem, and they live on opposite halves:

| The problem | The fix | Which half |
|---|---|---|
| The service **mishears** a word | custom speech model, phrase list | ear |
| The voice **says** a word wrong | custom lexicon + SSML | mouth |
| You want a brand-new voice | custom neural voice | mouth |

Only the **custom lexicon** is built here. A custom speech model and a custom
neural voice are both hourly-billed custom endpoints, and each would need its own
ADR before provisioning — see [ADR-0003](../../../../docs/adr/0003-speech-cost-posture.md).
Custom neural voice is additionally a Limited Access feature, available only to
customers with a Microsoft account team.

Run **B** and then **C** back to back and the boundary stops being abstract. Same
sentence, same voice, same service — only the pronunciation changes.

## The custom lexicon

`lexicon.xml` is a [PLS 1.0](https://www.w3.org/TR/pronunciation-lexicon/)
document. It is **not** an SSML document and can't be sent to the synthesiser
directly. It's published at a public URL and referenced from the SSML:

```xml
<lexicon uri="https://raw.githubusercontent.com/.../lexicon.xml"/>
```

That tag goes **inside** `<voice>`. The service fetches the file over the network
at synthesis time, so a local copy alone does nothing — it has to be pushed and
publicly reachable. A raw GitHub URL works and avoids provisioning a storage
account; Microsoft's docs list GitHub URIs as supported.

Two ways to fix a word, both in the file:

- `<alias>` — respell it. For acronyms and codes: `AI-103` → `A I one oh three`.
- `<phoneme>` — the exact sounds, in IPA. For names: `Elmi` → `ˈɛl.mi`.

Four things that will waste your time:

- **Cached 15 minutes by URL.** Edit, push, re-run, hear no change — that's the
  cache, not your code.
- **Lexemes are case sensitive.** `SSML` and `ssml` are separate entries.
- **One locale per file.** This one is `en-US`; it does nothing to a Swedish voice.
- **100 KB maximum** per file.

## Speech translation

Part **D** is one `TranslationRecognizer` — a source language, a target language,
a voice, done. It is *not* speech-to-text → Translator → text-to-speech chained by
hand, which is the answer any "least development effort" question is looking for.

Three settings, three different formats, and mixing them up is the usual failure:

```python
tcfg.speech_recognition_language = "en-US"        # locale
tcfg.add_target_language("sv")                    # short code
tcfg.voice_name = "sv-SE-SofieNeural"             # full voice name
```

The spoken translation does **not** come back on the result. It arrives in pieces
on the `synthesizing` event, which you must subscribe to before recognising.
`build.py` collects those pieces and writes `translation.wav` (gitignored).

## Cost model — S0, pay-per-call, capped per request

Full reasoning in [ADR-0003](../../../../docs/adr/0003-speech-cost-posture.md).
The short version:

- A **standalone** Azure Speech resource on **S0**, in `rg-ai-arena`. Not the
  Foundry resource — Foundry has no F0 path and provisions Speech at S0 anyway,
  and a separate resource keeps the Speech line item legible on the bill.
- **F0 was rejected** despite being unbillable: its concurrent request limit is 1
  and isn't adjustable, so the second simultaneous visitor to a live demo gets an
  error. A tile that breaks when two people open it is worse than a $2/day ceiling.
- Speech bills per **audio second in** and per **character out**. ADR-0001's
  `max_tokens` cap bounds neither, so the runtime route enforces
  `MAX_AUDIO_SECONDS = 30` and `MAX_SYNTHESIS_CHARS = 800` before any Azure call,
  plus a dedicated 100/day budget key. Worst case ≈ $2/day.
- Nothing bills while idle. `build.py` itself is unbounded — it's a dev script you
  run by hand, so keep test clips short.

## Auth note — this tile uses a key

Every other tile authenticates with `DefaultAzureCredential` (Entra ID, keyless).
This one passes `SPEECH_KEY` and `SPEECH_REGION` to `SpeechConfig`, because that's
the shape the Speech SDK takes. It's a real inconsistency in the repo, and it's
deliberate rather than an oversight.

Note also that the region is a **short name** (`northeurope`), not a URL — the SDK
builds the endpoint itself. Every other tile takes a full endpoint URL.

## Environment

Repo-root `.env`, gitignored — never committed:

```
SPEECH_KEY=<key 1 from the Speech resource>
SPEECH_REGION=<e.g. northeurope>
LEXICON_URI=https://raw.githubusercontent.com/<you>/<repo>/<branch>/src/app/nl/speech-assistant/lexicon.xml
```

`LEXICON_URI` points at a branch during development. Repoint it at `main` after
the merge, or it breaks when the branch is deleted.

## Run it

```
source .venv/bin/activate            # the repo-root venv, not tile #1's
pip install azure-cognitiveservices-speech python-dotenv
python3 src/app/nl/speech-assistant/build.py
```

macOS gates microphone access per application. The first run prompts whichever app
launched Python — Terminal, or VS Code if you're using its integrated terminal. If
every attempt returns `NoMatch`, check System Settings → Privacy & Security →
Microphone, then restart that app; the permission doesn't reach an already-running
process.

## Redeploy

Nothing to redeploy. There is no deployment, no agent, and no model — just a Speech
resource and a key. Delete `rg-ai-arena` and recreate the Speech resource on S0 to
get back to zero. The lexicon lives in this repo and is reproducible from code.

## Runtime note (Phase 2)

The browser records audio as WebM/Opus. The Speech SDK for JavaScript **does not
support compressed audio** — it takes WAV/PCM only — and Chrome can't record either
WAV or the OGG/Opus that the REST API would accept. The conversion therefore happens
in the browser: `decodeAudioData` unpacks the Opus (the browser already ships that
codec), `OfflineAudioContext` resamples to 16 kHz, and the result is written out as
a WAV. No server-side conversion, no ffmpeg, no extra dependency.

A useful side effect: 16 kHz mono 16-bit is exactly 32,000 bytes per second, so
`MAX_AUDIO_SECONDS = 30` is a 960 KB check on the request body — enforceable before
the request reaches Azure.

## Reference

- [Pronunciation with SSML — custom lexicon](https://learn.microsoft.com/azure/ai-services/speech-service/speech-synthesis-markup-pronunciation#custom-lexicon)
- [How to recognize and translate speech](https://learn.microsoft.com/azure/ai-services/speech-service/how-to-translate-speech)
- [Speech SDK Python reference](https://learn.microsoft.com/python/api/azure-cognitiveservices-speech/)
- [Quotas and limits for Azure Speech](https://learn.microsoft.com/azure/ai-services/speech-service/speech-services-quotas-and-limits)
