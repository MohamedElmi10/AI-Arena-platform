import { describe, it, expect } from "vitest";
import type { ReactElement } from "react";
import {
  tokenizeInline,
  stripCitations,
  parseBlocks,
  renderLines,
} from "./Markdown";

describe("stripCitations", () => {
  it("removes 【n†source】 retrieval markers and tidies spacing", () => {
    const src = "It runs on gpt-4.1-nano 【6:0†source】 【6:4†source】 .";
    expect(stripCitations(src)).toBe("It runs on gpt-4.1-nano.");
  });

  it("leaves prose without markers untouched", () => {
    expect(stripCitations("Just a normal sentence.")).toBe(
      "Just a normal sentence."
    );
  });
});

describe("tokenizeInline", () => {
  it("classifies bold, italic, and code", () => {
    expect(tokenizeInline("**b** *i* `c`").map((t) => t.type)).toEqual([
      "bold",
      "text",
      "italic",
      "text",
      "code",
    ]);
  });

  it("links a bare https URL and keeps trailing punctuation out of the href", () => {
    const toks = tokenizeInline("see https://github.com/MohamedElmi10.");
    const link = toks.find((t) => t.type === "link");
    expect(link).toMatchObject({
      type: "link",
      href: "https://github.com/MohamedElmi10",
      trail: ".",
    });
  });

  it("prefixes a bare www link with https", () => {
    const link = tokenizeInline("www.linkedin.com/in/-elmi").find(
      (t) => t.type === "link"
    );
    expect(link).toMatchObject({ href: "https://www.linkedin.com/in/-elmi" });
  });

  it("turns an email into a mailto link", () => {
    const email = tokenizeInline("Mohamed.elmiefc@gmail.com").find(
      (t) => t.type === "email"
    );
    expect(email).toMatchObject({ href: "mailto:Mohamed.elmiefc@gmail.com" });
  });

  it("does not linkify a non-http scheme (XSS guard)", () => {
    expect(tokenizeInline("javascript:alert(1)").every((t) => t.type === "text"))
      .toBe(true);
  });
});

describe("parseBlocks", () => {
  it("splits paragraphs, headings, and lists", () => {
    const blocks = parseBlocks("# H\n\npara\n\n- a\n- b");
    expect(blocks.map((b) => b.type)).toEqual(["h", "p", "ul"]);
  });
});

describe("renderLines", () => {
  it("gives every child in a multi-line paragraph a unique key", () => {
    const nodes = renderLines(["one two", "three four", "five six"]) as ReactElement[];
    const keys = nodes.map((n) => n.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
