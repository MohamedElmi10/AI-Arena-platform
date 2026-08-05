# T-003: Tile components + Planned modal

**Status:** open
**Blocked by:** T-002
**Blocks:** T-004

## Goal
Render every tile in Planned state. Click on a Planned tile opens a modal.

## Acceptance
- [ ] `<Tile>` component supports `status: 'live' | 'planned'` and a `featured` prop.
- [ ] Featured tile in each module (`tiles[0]`) rendered enlarged in a bento layout matching the prototype (col-span-8 + smaller siblings).
- [ ] Planned tile visuals: dashed border in module `color.bg`, faded text, module tint background. Description hidden unless featured.
- [ ] Live tile visuals (implemented but only reachable once T-008 flips the data): accent border, tint background, pulse dot + "● Live" pill, hover reveals the `preview` snippet, "Open agent →" footer.
- [ ] Clicking a Planned tile opens a shadcn `<Dialog>` with the tile title + description + "This tile will demo the concept when built."
- [ ] Clicking a Live tile navigates to `/agents/<slug>` (or `/genai/<slug>`, `/nl/<slug>`). No Live tiles yet — but the wiring works.
- [ ] Every tile: hover state (subtle lift or shadow) matching the prototype.

## Notes
- Reference: `renderColored`, `renderColoredSection`, `tileEditorial` in `docs/prototypes/landing.html`.
- Slug: kebab-case of the title. Store it in the tile data (`slug` field) so both the landing link and the playground route use the same value.
- Do NOT wire real Azure. This ticket is pure UI + navigation.
- Use `<Link>` from `next/link` for navigation, not `router.push` on click.
