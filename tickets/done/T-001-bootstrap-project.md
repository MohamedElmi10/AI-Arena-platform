# T-001: Bootstrap project

**Status:** open
**Blocked by:** —
**Blocks:** T-002, T-005

## Goal
Get a public GitHub repo with a running Next.js dev server and the spec material imported.

## Acceptance
- [ ] Public GitHub repo `ai-arena` exists under Mohamed's account.
- [ ] Next.js project scaffolded: App Router + TypeScript + Tailwind + src dir + import alias `@/*`.
- [ ] shadcn/ui initialised (New York style, neutral base). Components added: Button, Card, Dialog.
- [ ] `npm run dev` opens localhost:3000 (blank page is fine).
- [ ] `.gitignore` includes `.env*`, `.next/`, `node_modules/`.
- [ ] `CLAUDE.md`, `README.md` at repo root (copy from `AI-Arena-Spec/`).
- [ ] `docs/CONTEXT.md`, `docs/adr/0001-cost-safety-posture.md`, `docs/prototypes/*.html` populated (copy from `AI-Arena-Spec/`).
- [ ] `tickets/` folder with every open ticket (copy from `AI-Arena-Spec/tickets/`).
- [ ] `tickets/done/` empty folder exists.
- [ ] MIT `LICENSE` file at root.
- [ ] First commit message: `T-001: bootstrap project`.

## Notes
- Command: `npx create-next-app@latest ai-arena --typescript --tailwind --app --eslint --src-dir --import-alias "@/*"`
- shadcn init: `npx shadcn@latest init`
- Do NOT deploy yet — that's T-009.
- Do NOT install `openai`, `@upstash/redis`, `@upstash/ratelimit` yet — subsequent tickets add them just-in-time.
