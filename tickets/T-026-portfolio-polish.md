# T-026: Portfolio polish — copy, links, cert, mobile

**Status:** open
**Blocked by:** —
**Blocks:** —

## Goal
A pass of small portfolio fixes after go-live. One ticket, no new features.

## Acceptance
- [ ] "How it works" copy reads professionally: "The browser" (not "Your browser"),
  "Azure credentials" (not "Azure key"), and the last line is plain, not cryptic.
- [ ] Hero: LinkedIn points to the real URL; GitHub + LinkedIn open in a new tab
  (`target="_blank" rel="noopener noreferrer"`).
- [ ] AI-103 shown as **certified** (not "on the way to"), with a cert badge on the page.
- [ ] Mobile: the chat sits right after "Try this" — the guide's lower sections
  ("What to expect", "Under the hood") move below the chat on small screens.
- [ ] RAG corpus `09-about-mohamed.md`: AI Arena no longer called "the largest";
  AI-103 stated as earned.

## Notes
- Corpus edit updates the repo (portfolio surface) but NOT the live RAG index — that
  needs a re-sync per T-018 before the RAG agent answers with the new text.
- Cert badge is plain text for now; wrap it in a link to the Credly/Microsoft Learn
  credential when the URL is handy.
