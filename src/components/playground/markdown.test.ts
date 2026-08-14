import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown, parseBlocks } from "./Markdown";

// Render helper: exercises the real component (node env, no DOM needed).
const html = (src: string, trailing?: unknown) =>
  renderToStaticMarkup(
    createElement(Markdown, { children: src, trailing } as never)
  );

describe("parseBlocks", () => {
  it("splits paragraphs on blank lines", () => {
    const blocks = parseBlocks("First para.\n\nSecond para.");
    expect(blocks).toHaveLength(2);
    expect(blocks.every((b) => b.type === "p")).toBe(true);
  });

  it("groups consecutive list items", () => {
    const ul = parseBlocks("- a\n- b\n- c");
    expect(ul).toHaveLength(1);
    expect(ul[0]).toMatchObject({ type: "ul", items: ["a", "b", "c"] });

    const ol = parseBlocks("1. one\n2. two");
    expect(ol[0]).toMatchObject({ type: "ol", items: ["one", "two"] });
  });

  it("recognizes headings", () => {
    expect(parseBlocks("## Title")[0]).toMatchObject({ type: "h", level: 2 });
  });
});

describe("Markdown render", () => {
  it("renders bold without leaking asterisks", () => {
    const out = html("Azure **AI Search** grounds the answer.");
    expect(out).toContain("<strong>AI Search</strong>");
    expect(out).not.toContain("**");
  });

  it("renders inline code and italics", () => {
    expect(html("Run `build.py` now")).toContain("<code");
    expect(html("this is *important*")).toContain("<em>important</em>");
  });

  it("renders an unordered list", () => {
    const out = html("- first\n- second");
    expect(out).toContain("<ul");
    expect(out).toContain("<li>first</li>");
    expect(out).toContain("<li>second</li>");
  });

  it("gives blocks real spacing (space-y wrapper)", () => {
    const out = html("Para one.\n\nPara two.");
    expect(out).toContain("space-y-3");
    expect((out.match(/<p>/g) || []).length).toBe(2);
  });

  it("degrades gracefully on partial mid-stream markdown", () => {
    // An unclosed bold marker must render literally, never throw.
    const out = html("Here is a partial **bold");
    expect(out).toContain("**bold");
    expect(out).not.toContain("<strong>");
  });

  it("shows the trailing caret even before the first delta", () => {
    const out = html("", "CARET");
    expect(out).toContain("CARET");
  });

  it("appends the caret to the last block when streaming", () => {
    const out = html("Streaming answer", "CARET");
    expect(out).toContain("Streaming answerCARET");
  });
});
