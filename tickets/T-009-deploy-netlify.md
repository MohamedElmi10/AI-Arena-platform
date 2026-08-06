# T-009: Deploy to Netlify

**Status:** open
**Blocked by:** T-016  (deploy last — after all Agents + Gen-AI tiles are Live)
**Blocks:** —

## Goal
Get a live, shareable URL with the Foundry Chat Agent working end-to-end.

## Acceptance
- [ ] Netlify site created and connected to the GitHub repo. Auto-deploy from `main`.
- [ ] Netlify Next.js runtime configured (`@netlify/plugin-nextjs`).
- [ ] Environment variables set in Netlify UI (not in the repo):
  - `AZURE_OPENAI_ENDPOINT`
  - `AZURE_OPENAI_API_KEY`
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
  - `KILL_SWITCH=false`
- [ ] Push a test commit to `main` and confirm auto-deploy runs green.
- [ ] Live URL captured in `README.md` under "Live at:".
- [ ] **Smoke tests on the live URL:**
  - Landing loads, tile #1 shows Live.
  - Playground opens, real stream returns a response.
  - Rate limit blocks the 6th message in a minute (test from browser — 5 sends fast, 6th gets the friendly rate-limit bubble).
  - `KILL_SWITCH=true` toggle in Netlify → next request shows the paused message. Toggle back to `false`.

## Notes
- If Mohamed's Netlify account is full, use Vercel free tier — same setup, same env vars, same Next.js runtime.
- Do NOT commit `.env.local`. It's in `.gitignore` per T-001.
- After this ticket closes, AI Arena is publicly live with 1/11 tiles working. Next tiles follow the pattern in `tickets/TEMPLATE-next-tile.md`.
