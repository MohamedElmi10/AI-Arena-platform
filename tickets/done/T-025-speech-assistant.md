# T-025: Speech Assistant

**Status:** done
**Blocked by:** — · **Blocks:** —
**Module:** Natural Language · **Slug:** `speech-assistant`

## Goal

A tile you can talk to and hear back. It turns your speech into text, and reads
text aloud with a custom lexicon fixing how certain words are pronounced.

Speech translation is proven in `build.py` but is not wired into the page. The
page itself never touches the Speech SDK — both calls are plain HTTP.

## What shipped

- `src/app/nl/speech-assistant/build.py` — run it in a terminal and it prompts for
  A, B, C or D: listen, speak plain, speak with the lexicon, or translate. Each
  part testable on its own. Plus `lexicon.xml` and a README.
- `src/app/api/speech/speech-assistant/route.ts` — one route, two operations,
  chosen by content type. JSON in, audio out. WAV in, text out.
- `src/components/playground/SpeechPlayground.tsx` and its page.
- `withCostSafety` gained an optional `{ limit, key }` so a costly route can have
  its own daily budget. ADR-0002 specified it; T-021 never built it, so this did.
- `src/lib/lexicon.ts` — the taught-word list the UI reads, with a test that fails
  if it drifts from `lexicon.xml`.

## Decisions made here

**The MCP variant was dropped.** `modules.ts` promised a toggle between an app and
a Speech MCP agent. The MCP server needs the Agent Service Enterprise tier, a
storage account with SAS URLs, and raw key auth. It also can't take a live
microphone — it transcribes a file at a URL. If it's wanted later it's a new
ticket and a new ADR. T-024 shipped one wiring after promising a toggle; this time
the copy was fixed to match.

**S0, not F0.** F0 can't bill you but allows one concurrent request, so the second
visitor gets an error. See [ADR-0003](../docs/adr/0003-speech-cost-posture.md).

**Its own caps.** `withCostSafety` bounds output tokens, which is the wrong unit —
speech bills per second of audio in and per character out. So the route caps 30
seconds and 800 characters, checked before any Azure call, on a 100/day key.

**A bespoke page, not the shared `Playground`.** `Playground` hardcodes
`fetch('/api/chat/<slug>')` and assumes a chat. This tile records and plays, so it
reuses the header, guide and footer and owns its body.

**No SDK at runtime.** The JavaScript SDK won't accept browser audio anyway, so
both calls are plain HTTP and nothing was added to `package.json`. The browser
converts its own recording to the WAV Azure wants.

## Phase 1 — Build (Azure) — DONE

- [x] Standalone Speech resource, S0, in `rg-ai-arena`. Not the Foundry one.
- [x] `SPEECH_KEY`, `SPEECH_REGION`, `LEXICON_URI` in `.env` (gitignored).
- [x] `build.py` scaffolded TODO-style, filled in by hand.
- [x] `lexicon.xml` committed and served from a raw GitHub URL. No storage account.
- [x] README covering the tile, the cost model and the gotchas.
- [x] No custom speech model, no custom neural voice — both are hourly-billed and
      would need their own ADR.

## Phase 2 — Wire — DONE

- [x] Route wrapped in `withCostSafety(handler, { limit: 100, key: "speech" })`.
- [x] `MAX_AUDIO_SECONDS = 30` and `MAX_SYNTHESIS_CHARS = 800`, both checked before
      the Azure call.
- [x] Caps verified by curl, not through the UI — the recorder and textarea stop
      you first, so the browser never reaches either limit.
- [x] Keys stay server-side.
- [x] Before/after playback, so you can hear what the lexicon changed.
- [x] `guide` added to `data/modules.ts`.

## Phase 3 — Flip — DONE

- [x] `status: 'live'`, with a `preview`.
- [x] `tag` and `desc` match what shipped. No "MCP", no "toggle".
- [x] `docs/CONTEXT.md` tile map corrected.
- [x] T-018 corpus pass — done under T-012, which cleared all three tiles' debt
      at once. `12-tile-speech-assistant.md` added; the module map corrected.

## Notes

- Speech translation is one `TranslationRecognizer`, not three chained calls. The
  spoken translation arrives on an event, not on the result.
- **Deploy:** Netlify needs `SPEECH_KEY`, `SPEECH_REGION` and `LEXICON_URI`. Point
  `LEXICON_URI` at `main` before deleting the branch.
