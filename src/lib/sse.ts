// Minimal client-side SSE parsing for the Foundry chat stream. Pure functions,
// no DOM — so they unit-test without a browser. The route emits frames shaped
// like `data: {json}\n\n` (see src/app/api/chat/foundry-chat-agent/route.ts).

/** The parsed payloads the route can send inside an SSE `data:` frame. */
export type FoundryStreamEvent =
  | { delta: string }
  | { done: true; outputTokens?: number }
  | { error: string; message: string };

/**
 * Split a text buffer into complete SSE frames plus a trailing remainder that
 * hasn't terminated (`\n\n`) yet. Call it as chunks arrive, carrying `rest`
 * forward into the next call.
 */
export function splitSSEFrames(buffer: string): {
  frames: string[];
  rest: string;
} {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  return { frames: parts.filter((p) => p.trim() !== ""), rest };
}

/**
 * Parse one SSE frame's `data:` line into an object. Returns null for frames
 * with no data line or empty data (e.g. keep-alive comments).
 */
export function parseSSEFrame(frame: string): FoundryStreamEvent | null {
  const dataLine = frame
    .split("\n")
    .find((line) => line.startsWith("data:"));
  if (!dataLine) return null;
  const json = dataLine.slice("data:".length).trim();
  if (!json) return null;
  return JSON.parse(json) as FoundryStreamEvent;
}
