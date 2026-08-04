# T-008: Flip Foundry Chat Agent to Live

**Status:** open
**Blocked by:** T-007
**Blocks:** T-009

## Goal
Change tile #1 from Planned to Live in the data. The landing rendering should update with no other code changes.

## Acceptance
- [ ] `data/modules.ts` → Agents module → `foundry-chat-agent` tile → `status: 'live'`.
- [ ] Landing renders the tile Live: accent border, tint background, pulse dot + "● Live" pill, hover-revealed preview, "Open agent →" footer.
- [ ] Landing counts update: Agents shows `1 / 7 live`. Global summary (if any) shows `1 / 11 live`.
- [ ] Click on the tile navigates to `/agents/foundry-chat-agent` and the playground works end-to-end (real stream).

## Notes
- **Smallest possible commit** — a one-line data edit + verify.
- If any Acceptance item fails, don't fix it here. Reopen T-003 or T-007 and address there.
