import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Minimal, dependency-free Markdown renderer for agent replies.
//
// Why hand-rolled instead of react-markdown: the agents emit a small, known
// subset of Markdown (bold, italic, inline code, paragraphs, lists, plus bare
// URLs/emails), so a compact renderer keeps the public repo dependency-light and
// readable — and it is XSS-safe by construction (we build React elements and
// never set raw HTML, and only ever emit http(s)/mailto hrefs). It degrades
// gracefully on the partial Markdown that arrives mid-stream: an unclosed `**`
// renders as literal text, never a crash.

// --- citations -------------------------------------------------------------

// The RAG agent injects retrieval markers like 【10:0†source】 into its prose.
// They are noise to a reader; strip them from the bubble. T-019 Part B surfaces
// the real, clickable sources in a separate list. Non-destructive: the caller
// still holds the raw text (with markers) for that mapping.
export function stripCitations(src: string): string {
  return src
    .replace(/【[^】]*†source】/g, "")
    .replace(/ +([.,;:!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ");
}

// --- inline tokens: **bold**, *italic*, `code`, links, emails ---------------

// One pass, precedence left to right. Bold is matched before italic so `**x**`
// isn't read as two italics. URLs/emails are matched last so markup wins. An
// unterminated marker matches nothing and falls through as literal text.
const INLINE =
  /(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\n]+\*|https?:\/\/[^\s【】]+|www\.[^\s【】]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

export type InlineToken =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "code"; value: string }
  | { type: "link"; value: string; href: string; trail: string }
  | { type: "email"; value: string; href: string; trail: string };

// Trailing sentence punctuation shouldn't be swallowed into a link's href.
function splitTrail(part: string): { core: string; trail: string } {
  const trail = (part.match(/[.,;:!?)\]]+$/) || [""])[0];
  return { core: trail ? part.slice(0, -trail.length) : part, trail };
}

export function tokenizeInline(text: string): InlineToken[] {
  const out: InlineToken[] = [];
  for (const part of text.split(INLINE)) {
    if (part === "") continue;
    if (/^\*\*[^*\n]+\*\*$/.test(part)) {
      out.push({ type: "bold", value: part.slice(2, -2) });
    } else if (/^`[^`\n]+`$/.test(part)) {
      out.push({ type: "code", value: part.slice(1, -1) });
    } else if (/^\*[^*\n]+\*$/.test(part)) {
      out.push({ type: "italic", value: part.slice(1, -1) });
    } else if (/^https?:\/\//.test(part) || /^www\./.test(part)) {
      const { core, trail } = splitTrail(part);
      const href = /^www\./.test(core) ? `https://${core}` : core;
      out.push({ type: "link", value: core, href, trail });
    } else if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(part)) {
      out.push({ type: "email", value: part, href: `mailto:${part}`, trail: "" });
    } else {
      out.push({ type: "text", value: part });
    }
  }
  return out;
}

const LINK_CLS =
  "text-[color:var(--accent)] underline underline-offset-2 break-words hover:opacity-80";

function renderInline(text: string): ReactNode[] {
  return tokenizeInline(text).map((tok, i) => {
    switch (tok.type) {
      case "bold":
        return <strong key={i}>{tok.value}</strong>;
      case "italic":
        return <em key={i}>{tok.value}</em>;
      case "code":
        return (
          <code
            key={i}
            className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[0.85em]"
          >
            {tok.value}
          </code>
        );
      case "link":
        return (
          <Fragment key={i}>
            <a href={tok.href} target="_blank" rel="noopener noreferrer" className={LINK_CLS}>
              {tok.value}
            </a>
            {tok.trail}
          </Fragment>
        );
      case "email":
        return (
          <a key={i} href={tok.href} className={LINK_CLS}>
            {tok.value}
          </a>
        );
      default:
        return <Fragment key={i}>{tok.value}</Fragment>;
    }
  });
}

// Soft line breaks inside a single paragraph become <br> so the model's
// intended line structure survives. Each line's inline output is wrapped in a
// keyed Fragment so renderInline's per-line keys (which restart at 0) can't
// collide across lines within one paragraph.
export function renderLines(lines: string[]): ReactNode[] {
  return lines.flatMap((line, i) => {
    const content = <Fragment key={`l-${i}`}>{renderInline(line)}</Fragment>;
    return i === 0 ? [content] : [<br key={`br-${i}`} />, content];
  });
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
  const blocks = parseBlocks(stripCitations(children));

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
          case "h": {
            // Real heading elements so screen readers get landmarks and each
            // level reads distinctly. Mapped to h3–h5 (not h1/h2) so a heading
            // inside a chat bubble stays subordinate to the page's own title.
            const levels = {
              1: { Tag: "h3", cls: "text-base font-semibold" },
              2: { Tag: "h4", cls: "text-sm font-semibold" },
              3: { Tag: "h5", cls: "text-sm font-semibold text-neutral-500" },
            } as const;
            const { Tag, cls } = levels[block.level as 1 | 2 | 3] ?? levels[3];
            return (
              <Tag key={i} className={cls}>
                {renderInline(block.text)}
                {tail}
              </Tag>
            );
          }
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
