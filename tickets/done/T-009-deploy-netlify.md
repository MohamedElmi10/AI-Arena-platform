# T-009: Deploy to Netlify

**Status:** open
**Blocked by:** T-016 (satisfied — in done/)
**Blocks:** —

## Goal
Get a live, shareable URL with all currently-Live tiles working end-to-end.

> Scope note (2026-08-27): the original ticket assumed "1/11 tiles working." The
> repo now has **5 Live tiles** across two auth models — deploy covers all five:
> - **Key-auth** (model-inference endpoint, accepts an API key): Foundry Chat,
>   Function-Calling, Raw Streaming.
> - **Token-auth** (Foundry Agents service — Entra ID only, no key exists):
>   RAG Agent, Text Analysis Agent. These need a service principal on Netlify.

## Acceptance
- [ ] `netlify.toml` committed (Next.js runtime plugin + build config).
- [ ] Netlify site created and connected to the GitHub repo. Auto-deploy from `main`.
- [ ] **Environment variables set in the Netlify UI** (never in the repo):
  - Key-auth tiles: `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `MODEL_ENDPOINT`
  - Token-auth tiles: `PROJECT_ENDPOINT`, `RAG_AGENT_NAME`, `TEXT_ANALYSIS_AGENT_NAME`
  - Service principal (for `DefaultAzureCredential` on Netlify): `AZURE_CLIENT_ID`,
    `AZURE_TENANT_ID`, `AZURE_CLIENT_SECRET`
  - `KILL_SWITCH=false`
  - (No Upstash vars — the daily-budget counter uses **Netlify Blobs**, which
    auto-provisions. The old Upstash entries in this ticket were never read by the code.)
- [ ] Azure service principal created and granted the **Foundry Agent Consumer**
  role on the **Foundry project** (least-privilege; `Foundry User` also works).
  `Owner`/`Contributor` do NOT grant agent-endpoint access.
- [ ] Push a test commit to `main` and confirm auto-deploy runs green.
- [ ] Live URL captured in `README.md` under "Live at:".
- [ ] **Smoke tests on the live URL:**
  - Landing loads; the 5 Live tiles show Live.
  - Each Live playground opens and returns a real streamed response:
    Foundry Chat, Function-Calling, Raw Streaming (key-auth); RAG, Text Analysis (token-auth).
  - RAG answer shows cited sources.
  - Rate/budget limit: fast-fire messages until the daily cap → friendly cap bubble.
  - `KILL_SWITCH=true` in Netlify → next request shows the paused message. Toggle back to `false`.

## Notes
- Do NOT commit `.env.local`. It's gitignored per T-001.
- **Vercel is NOT a drop-in fallback:** the budget counter writes to Netlify Blobs
  (ADR-0001 / T-005). On Vercel that layer breaks and would need re-homing (e.g.
  Upstash Redis) — that's a separate ticket, not a same-setup swap.
- Token scope the agent routes request: `https://ai.azure.com/.default`.
- After Entra role assignment, wait ≥5 min before the first call — RBAC propagation
  delay is the #1 cause of a 401/403 on the RAG/Text-Analysis tiles.
- Fast-follow safety valve: if the SP wiring slips, flip RAG + Text Analysis to
  `planned` in `data/modules.ts` (a data edit) so the live site shows 3 working
  tiles and zero 500s, then flip back when the SP is ready — no logic redeploy.
