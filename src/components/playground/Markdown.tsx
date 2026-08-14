import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Minimal, dependency-free Markdown renderer for agent replies.
//
// Why hand-rolled instead of react-markdown: the agents emit a small, known
// subset of Markdown (bold, italic, inline code, paragraphs, and lists), so a
// ~60-line renderer keeps the public repo dependency-light and readable — and
// it is XSS-safe by construction (we build React elements and never set raw
// HTML). It also degrades gracefully on the partial Markdown that arrives
// mid-stream: an unclosed `**` renders as literal text, never a crash.

// --- inline: **bold**, *italic*, `code` -------------------------------------

// Bold is matched before italic so `**x**` isn't mistaken for two italics. An
// unterminated marker matches nothing here and falls through as literal text.
const INLINE = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\n]+\*)/g;

function renderInline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (/^\*\*[^*\n]+\*\*$/.test(part)) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (/^`[^`\n]+`$/.test(part)) {
      return (
        <code
          key={i}
          className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[0.85em]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (/^\*[^*\n]+\*$/.test(part)) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

// Soft line breaks inside a single paragraph become <br> so the model's
// intended line structure survives.
function renderLines(lines: string[]): ReactNode[] {
  return lines.flatMap((line, i) =>
    i === 0
      ? renderInline(line)
      : [<br key={`br-${i}`} />, ...renderInline(line)]
  );
}

// --- blocks: paragraphs, headings, ordered/unordered lists ------------------

export type Block =
  | { type: "p"; lines: string[] }
  | { type: "h"; level: number; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

const isUl = (l: string) => /^\s*[-*]\s+/.test(l);
const isOl = (l: string) => /^\s*\d+\.\s+/.test(l);
const isH = (l: string) => /^#{1,3}\s+/.test(l);

export function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      blocks.push({ type: "h", level: heading[1].length, text: heading[2] });
      i++;
      continue;
    }

    if (isUl(line)) {
      const items: string[] = [];
      while (i < lines.length && isUl(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (isOl(line)) {
      const items: string[] = [];
      while (i < lines.length && isOl(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !isUl(lines[i]) &&
      !isOl(lines[i]) &&
      !isH(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ type: "p", lines: para });
  }

  return blocks;
}

type MarkdownProps = {
  children: string;
  className?: string;
  // Appended to the end of the last block — used for the streaming caret so it
  // trails the live text instead of jumping to its own line.
  trailing?: ReactNode;
};

export function Markdown({ children, className, trailing }: MarkdownProps) {
  const blocks = parseBlocks(children);

  // Before the first delta lands the text is empty; still show the caret.
  if (blocks.length === 0) {
    return <div className={className}>{trailing}</div>;
  }

  const last = blocks.length - 1;

  return (
    <div className={cn("space-y-3", className)}>
      {blocks.map((block, i) => {
        const tail = i === last ? trailing : null;

        switch (block.type) {
          case "h":
            return (
              <p key={i} className="font-semibold">
                {renderInline(block.text)}
                {tail}
              </p>
            );
          case "ul":
            return (
              <ul key={i} className="list-disc space-y-1 pl-5">
                {block.items.map((item, j) => (
                  <li key={j}>
                    {renderInline(item)}
                    {j === block.items.length - 1 ? tail : null}
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="list-decimal space-y-1 pl-5">
                {block.items.map((item, j) => (
                  <li key={j}>
                    {renderInline(item)}
                    {j === block.items.length - 1 ? tail : null}
                  </li>
                ))}
              </ol>
            );
          default:
            return (
              <p key={i}>
                {renderLines(block.lines)}
                {tail}
              </p>
            );
        }
      })}
    </div>
  );
}
