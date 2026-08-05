# T-002: Landing hero + module scaffolding

**Status:** open
**Blocked by:** T-001
**Blocks:** T-003

## Goal
Render the Editorial · Colored landing hero and three empty module sections. No tiles yet.

## Acceptance
- [ ] `/` route renders with the paper-textured background from the prototype.
- [ ] Hero block: "Vol. 1 · AI Arena" eyebrow + "Mohamed Elmi" (Fraunces 6xl/7xl) + tagline (Fraunces italic) + GitHub + LinkedIn links.
- [ ] Fonts loaded via `next/font/google`: Inter (body), Fraunces (display), JetBrains Mono (metadata).
- [ ] Three module sections rendered from `data/modules.ts`:
  - Chapter pill (colored, per module accent).
  - Section header (module name in accent-fg colour).
  - One-line blurb.
  - Section counts (`0 / N live`) computed from the tile array.
- [ ] `data/modules.ts` contains all **11 tiles** as specified in `docs/CONTEXT.md` §Tile Map, every one `status: 'planned'`.
- [ ] Sections render placeholders where tiles will go (empty grid cells or a single "Tiles coming in T-003" note). Do NOT render `<Tile>` yet.

## Notes
- Reference: `docs/prototypes/landing.html` — variant B (Editorial · Colored) `renderColored` + `renderColoredSection`.
- Module colour palette: `docs/CONTEXT.md` §Module. Put them in `data/modules.ts` alongside the tiles so they're one source of truth.
- Move inline styles from the prototype into Tailwind utilities where possible. CSS variables only for the per-module accent colours (they change per section).
- The `Insight Visual Data` fourth module is **not** rendered — it's future. But `data/modules.ts` may include a commented placeholder so the shape is remembered.
