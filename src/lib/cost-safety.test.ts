import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock Netlify Blobs — an in-memory store we control per test.
const store = new Map<string, string>();
vi.mock("@netlify/blobs", () => ({
  getStore: () => ({
    get: async (key: string) => store.get(key) ?? null,
    set: async (key: string, value: string) => {
      store.set(key, value);
    },
  }),
}));

import {
  clampMaxTokens,
  DAILY_MESSAGE_CAP,
  dailyKey,
  MAX_OUTPUT_TOKENS,
  withCostSafety,
} from "./cost-safety";

const ok = () => new Response("hello", { status: 200 });

beforeEach(() => {
  store.clear();
  delete process.env.KILL_SWITCH;
});
afterEach(() => vi.restoreAllMocks());

describe("clampMaxTokens", () => {
  it("caps a too-large request down to the limit", () => {
    expect(clampMaxTokens({ max_output_tokens: 5000 }).max_output_tokens).toBe(
      MAX_OUTPUT_TOKENS
    );
  });
  it("defaults the cap when none is given", () => {
    expect(clampMaxTokens({}).max_output_tokens).toBe(MAX_OUTPUT_TOKENS);
  });
  it("leaves a smaller request untouched", () => {
    expect(clampMaxTokens({ max_output_tokens: 100 }).max_output_tokens).toBe(100);
  });
});

describe("kill switch", () => {
  it("returns 503 paused and never calls the handler", async () => {
    process.env.KILL_SWITCH = "true";
    const handler = vi.fn(ok);
    const res = await withCostSafety(handler)(new Request("http://x"));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: "paused" });
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("daily budget cap", () => {
  it("calls the handler and reserves a message when under cap", async () => {
    const handler = vi.fn(ok);
    const res = await withCostSafety(handler)(new Request("http://x"));
    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
    expect(store.get(dailyKey())).toBe("1");
  });

  it("blocks with 429 budget_capped when at cap, without calling the handler", async () => {
    store.set(dailyKey(), String(DAILY_MESSAGE_CAP));
    const handler = vi.fn(ok);
    const res = await withCostSafety(handler)(new Request("http://x"));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body).toMatchObject({ error: "budget_capped" });
    expect(body.retryAfter).toBeTruthy();
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("graceful errors + context", () => {
  it("passes the token cap to the handler and returns 500 on handler throw", async () => {
    let seenCap = 0;
    const handler = vi.fn((_req: Request, ctx: { maxOutputTokens: number }) => {
      seenCap = ctx.maxOutputTokens;
      throw new Error("azure exploded");
    });
    const res = await withCostSafety(handler)(new Request("http://x"));
    expect(seenCap).toBe(MAX_OUTPUT_TOKENS);
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "server_error" });
  });
});
