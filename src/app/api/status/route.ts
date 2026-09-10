import { getStore } from "@netlify/blobs";
import { dailyKey } from "@/lib/cost-safety";

// Read-only daily call counts from the cost-safety Blobs store. No secrets and
// no Azure call — just the same per-UTC-day counters withCostSafety writes.
//
// Token-gated: this is a public repo on a public site, so the numbers aren't
// exposed. STATUS_TOKEN lives only in the deploy env (never committed); a missing
// or wrong ?key= returns a plain 404 so the route doesn't advertise itself.
export const runtime = "nodejs";

// Budget keys the app increments (see cost-safety.ts + the CU/DI routes).
const KEYS = ["budget", "content-understanding", "document-intelligence"] as const;

export async function GET(req: Request): Promise<Response> {
  const token = process.env.STATUS_TOKEN;
  const given = new URL(req.url).searchParams.get("key");
  if (!token || given !== token) {
    return new Response("Not found", { status: 404 });
  }

  const now = new Date();
  const counts: Record<string, number> = {};
  try {
    const store = getStore("cost-safety");
    await Promise.all(
      KEYS.map(async (k) => {
        const raw = await store.get(dailyKey(now, k));
        counts[k] = raw ? Number(raw) : 0;
      })
    );
  } catch {
    return new Response(JSON.stringify({ error: "store_unavailable" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return new Response(
    JSON.stringify({ date: now.toISOString().slice(0, 10), counts, total }),
    {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    }
  );
}
