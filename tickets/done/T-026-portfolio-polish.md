# T-026: Portfolio polish — copy, links, cert, mobile

**Status:** done — shipped in #24 and #26, verified against the code 2026-09-04
**Blocked by:** —
**Blocks:** —

## Goal
A pass of small portfolio fixes after go-live. One ticket, no new features.

## Acceptance
- [x] "How it works" copy reads professionally: "The browser" (not "Your browser"),
  "Azure credentials" (not "Azure key"), and the last line is plain, not cryptic.
- [x] Hero: LinkedIn points to the real URL; GitHub + LinkedIn open in a new tab
  (`target="_blank" rel="noopener noreferrer"`).
- [x] AI-103 shown as **certified** (not "on the way to"), with a cert badge on the page.
- [x] Mobile: the chat sits right after "Try this" — the guide's lower sections
  ("What to expect", "Under the hood") move below the chat on small screens.
- [x] RAG corpus `09-about-mohamed.md`: AI Arena no longer called "the largest";
  AI-103 stated as earned.

## Verified
- "The browser" / "Azure credentials" — `ArchitectureDiagram.tsx`. Closing line reads
  "Tokens stream back along the same path, rendered live in the chat."
- `Hero.tsx` — LinkedIn on the real URL; GitHub and LinkedIn both
  `target="_blank" rel="noopener noreferrer"`.
- AI-103 shown as certified, and the badge links to the real Microsoft Learn
  credential rather than being plain text as the ticket allowed for.
- `Playground.tsx` — `part="top"` / `part="bottom"` with explicit order classes, so
  the chat sits between the two halves of the guide on mobile.
- `09-about-mohamed.md` — "largest" gone, AI-103 stated as held.

## Notes
- Corpus edit updates the repo (portfolio surface) but NOT the live RAG index — that
  needs a re-sync per T-018 before the RAG agent answers with the new text.
- Cert badge is plain text for now; wrap it in a link to the Credly/Microsoft Learn
  credential when the URL is handy.
