import { describe, expect, it } from "vitest";
import { parseSSEFrame, splitSSEFrames } from "./sse";

describe("splitSSEFrames", () => {
  it("splits complete frames and carries an unterminated remainder", () => {
    const { frames, rest } = splitSSEFrames(
      'data: {"delta":"a"}\n\ndata: {"delta":"b"}\n\ndata: {"del'
    );
    expect(frames).toEqual(['data: {"delta":"a"}', 'data: {"delta":"b"}']);
    expect(rest).toBe('data: {"del');
  });

  it("returns no frames when nothing has terminated yet", () => {
    const { frames, rest } = splitSSEFrames('data: {"delta":"a"}');
    expect(frames).toEqual([]);
    expect(rest).toBe('data: {"delta":"a"}');
  });

  it("ignores blank frames from a trailing double newline", () => {
    const { frames, rest } = splitSSEFrames('data: {"done":true}\n\n');
    expect(frames).toEqual(['data: {"done":true}']);
    expect(rest).toBe("");
  });
});

describe("parseSSEFrame", () => {
  it("parses a delta frame", () => {
    expect(parseSSEFrame('data: {"delta":"hi"}')).toEqual({ delta: "hi" });
  });

  it("parses a done frame with usage", () => {
    expect(parseSSEFrame('data: {"done":true,"outputTokens":42}')).toEqual({
      done: true,
      outputTokens: 42,
    });
  });

  it("parses an error frame", () => {
    expect(
      parseSSEFrame('data: {"error":"paused","message":"Paused."}')
    ).toEqual({ error: "paused", message: "Paused." });
  });

  it("returns null for a frame with no data line", () => {
    expect(parseSSEFrame(": keep-alive comment")).toBeNull();
  });

  it("returns null for an empty data payload", () => {
    expect(parseSSEFrame("data: ")).toBeNull();
  });
});
