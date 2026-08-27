import {
  DefaultAzureCredential,
  ClientSecretCredential,
  type TokenCredential,
} from "@azure/identity";

// Credential for calling a Foundry-hosted agent endpoint (RAG, Text Analysis).
//
// Build it LAZILY, on first request — never at module top level. On Netlify the
// service-principal env vars are injected per-invocation, not at cold start, so a
// credential built at module load sees no AZURE_* vars: DefaultAzureCredential
// silently drops EnvironmentCredential and falls back to managed identity, which
// doesn't exist on Netlify. Reading the vars on first request (when they're
// present) and using ClientSecretCredential directly avoids the whole guessing chain.
//
// Prod (Netlify): a service principal via AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET.
// Local dev: none of those set → DefaultAzureCredential uses your `az login` session.

let cached: TokenCredential | undefined;

export function getAgentCredential(): TokenCredential {
  if (cached) return cached;

  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (tenantId && clientId && clientSecret) {
    cached = new ClientSecretCredential(tenantId, clientId, clientSecret);
  } else if (tenantId || clientId || clientSecret) {
    // Some but not all set — a misconfiguration worth failing loudly on.
    throw new Error(
      "Incomplete service-principal config: set AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET together."
    );
  } else {
    cached = new DefaultAzureCredential(); // local dev via `az login`
  }

  return cached;
}
