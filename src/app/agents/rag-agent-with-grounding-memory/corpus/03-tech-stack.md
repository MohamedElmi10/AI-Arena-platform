# Tech Stack and Design

AI Arena is built on **Next.js 16** (App Router, with a `src/` directory),
**TypeScript**, **Tailwind CSS v4**, and **shadcn/ui** components (the New York
style, neutral base, built on Radix). Azure calls use the Node.js `openai`
package. Tests run on **Vitest**. Everything in the dependency tree is free and
open-source — no paid APIs or hosted services.

The default model for the hosted chat agents is **`gpt-5-mini`**. (The original
spec called for `gpt-4o-mini`, which retired in 2026 and can no longer be
deployed, so the project moved to `gpt-5-mini`.) The RAG tile is the exception:
its agent runs on **`gpt-4.1-nano`**, because the Azure AI Search tool it uses
does not yet support the gpt-5 family. The RAG tile also uses the embedding
model `text-embedding-3-small` to build its search index.

The visual direction is **"Editorial · Colored."** The background is a
paper-textured cream (`#faf7f2`) with a subtle grain. Typography uses three
faces: **Fraunces**, a serif, for display headings; **Inter** for body text; and
**JetBrains Mono** for metadata such as tags, chapter markers, and counts.

Each module carries an accent color that its tiles inherit — terracotta for
Agents, plum for Gen-AI, moss for Natural Language. Live tiles use their
module's accent for the border, a tinted background, a pulsing "live" dot, and a
hover-revealed example prompt. Planned tiles are dashed-border and faded in the
same tint. Each module features one enlarged tile in a bento-style layout.

The repository is public and hosted on GitHub. The app is deployed on Netlify.
