// Single source of truth for the landing wall.
// Modules and tiles live here; flipping a tile from 'planned' to 'live'
// is a data edit, not a code edit (see docs/CONTEXT.md §Tile State).

export type TileStatus = "live" | "planned";

/** The instructional panel shown inside a tile's playground. */
export type TileGuide = {
  /** One paragraph: what this demo is. */
  about: string;
  /** Tap-to-insert example prompts. */
  tryThis: string[];
  /** What the visitor should watch for. */
  expect: string[];
  /** "Under the hood" implementation notes. */
  hood: string[];
  /** Opening agent message. Falls back to a generic greeting when absent. */
  greeting?: string;
};

export type Tile = {
  title: string;
  /** kebab-case of the title; used by both the landing link and the playground route. */
  slug: string;
  /** The Azure service that powers this tile (wordmark attribution — T-017). */
  poweredBy: string;
  model?: string;
  status: TileStatus;
  /** Short mono-font label, e.g. "streaming" or "RAG · grounding · memory". */
  tag: string;
  /** One-line description shown in the "planned" modal. */
  desc: string;
  /** Example prompt revealed on hover for live tiles (added when a tile ships). */
  preview?: string;
  /** Optional streaming-mode toggle for the playground (e.g. sync vs async — T-016). */
  modes?: { label: string; value: string }[];
  /** Playground guide content. Present only once a tile's playground is built. */
  guide?: TileGuide;
};

/** A module's accent palette (docs/CONTEXT.md §Module). */
export type ModuleColor = {
  /** Foreground: headings and section title text. */
  fg: string;
  /** Solid tint background for the chapter pill. */
  bg: string;
  /** Accent: borders, underscore bar, count text, live-tile accents. */
  accent: string;
  /** Faint tint for live-tile backgrounds. */
  tint: string;
};

export type Module = {
  id: string;
  name: string;
  blurb: string;
  color: ModuleColor;
  tiles: Tile[];
};

export const modules: Module[] = [
  {
    id: "agents",
    name: "Agents",
    blurb:
      "Agents built with Microsoft Agent Framework, Foundry, MCP, function calling, RAG, A2A, and sequential orchestration.",
    color: { fg: "#9a3412", bg: "#fed7aa", accent: "#c2410c", tint: "#fff7ed" }, // terracotta
    tiles: [
      {
        title: "Foundry Chat Agent",
        slug: "foundry-chat-agent",
        status: "live",
        tag: "streaming",
        poweredBy: "Azure AI Foundry",
        desc: "A simple Foundry-hosted chat agent. Streams responses token-by-token.",
        preview: 'Try: "Give me an elevator pitch for AI Arena."',
        guide: {
          greeting:
            "Hi — I'm a streaming chat agent on Azure AI Foundry. Ask me anything, or tap a suggested prompt.",
          about:
            "This is the baseline agent — no memory across turns, no tools, no retrieval. Just a hosted chat agent behind the Foundry Responses API. Every other tile in Agents is a variation on this pattern.",
          tryThis: [
            "Give me an elevator pitch for AI Arena.",
            "Explain the difference between an agent and a chatbot.",
            "What is Azure AI Foundry, in one sentence?",
          ],
          expect: [
            "Response streams character-by-character.",
            "Neutral tone tuned for portfolio demos.",
            "No tool calls, no citations — those live in other tiles.",
          ],
          hood: [
            "Azure AI Foundry hosts the agent.",
            "Next.js API route acts as a thin proxy (Azure keys stay server-side).",
            "Streaming via the Responses API (event: response.output_text.delta).",
          ],
        },
      },
      {
        title: "Function-Calling Agent",
        slug: "function-calling-agent",
        status: "live",
        tag: "tools · async",
        poweredBy: "Azure AI Foundry",
        desc: "A chatbot that calls custom tools to get things done. Demonstrates function calling and async patterns.",
        preview: 'Try: "What time is it, and what is 128 * 47?"',
        guide: {
          greeting:
            "Ask me something that needs a real answer — the time, some maths — and I'll call a tool to get it. Or tap a suggested prompt.",
          about:
            "One step up from the baseline chat agent: this one can call tools. When a question needs a precise answer, the model doesn't guess — it asks the server to run a custom tool, gets the result back, and finishes the reply. Same gpt-5-mini deployment as tile #1, now with function calling.",
          tryThis: [
            "What time is it right now, and what is 128 * 47?",
            "What's 15% of 340?",
            "What time is it in Sweden right now?",
          ],
          expect: [
            "A 🔧 line shows each tool the model called and what it returned.",
            "The final answer uses the tool result, not a guess.",
            "Ask something with no tool and it just answers directly.",
          ],
          hood: [
            "The AI answers in two steps: it asks for a tool, the server runs it, then the AI replies using the result.",
            "The tools and the secret Azure key run on the server, never in the browser — so the key stays private.",
            "The calculator only accepts numbers and math symbols, so it can never run anything but arithmetic.",
          ],
        },
      },
      {
        title: "RAG Agent with Grounding & Memory",
        slug: "rag-agent-with-grounding-memory",
        status: "live",
        tag: "RAG · grounding · memory",
        poweredBy: "Azure AI Foundry",
        model: "gpt-4.1-nano",
        desc: "Retrieval-augmented generation with grounded citations and memory that persists across turns.",
        preview: 'Try: "What is AI Arena, and how does it keep costs down?"',
        guide: {
          greeting:
            "Ask me about AI Arena or Mohamed — I answer only from a small set of docs, and I cite what I use. Or tap a suggested prompt.",
          about:
            "This agent answers only from a small corpus about AI Arena and Mohamed, stored in an Azure AI Search index. It retrieves the most relevant passages, grounds its answer in them, cites what it used, and remembers the conversation across turns.",
          tryThis: [
            "How does AI Arena work?",
            "How does this RAG tile actually work?",
            "What's Mohamed's background?",
          ],
          expect: [
            "Answers are drawn only from the corpus, with citations.",
            "Ask a follow-up — it keeps context from earlier turns.",
            "Ask something outside the docs and it says so instead of guessing.",
          ],
          hood: [
            "A Foundry-hosted agent with an Azure AI Search tool over the ai-arena-rag index.",
            "The Next.js route proxies to the agent — Azure creds stay server-side, wrapped in withCostSafety.",
            "Runs on gpt-4.1-nano",
          ],
        },
      },
      
      {
        title: "MCP Agent (Hosted + Own)",
        slug: "mcp-agent-hosted-own",
        status: "planned",
        tag: "MCP",
        poweredBy: "Azure AI Foundry",
        desc: "Toggle between calling a Microsoft-hosted MCP server and my own MCP server. Same task, two implementations.",
      },
      {
        title: "Microsoft Agent Framework Agent",
        slug: "microsoft-agent-framework-agent",
        status: "planned",
        tag: "MAF",
        poweredBy: "Azure AI Foundry",
        desc: "The same agent built with Microsoft Agent Framework instead of Foundry-native, so the pattern differences are visible.",
      },
      {
        title: "Multi-Agent Orchestration",
        slug: "multi-agent-orchestration",
        status: "planned",
        tag: "workflow · A2A · sequential",
        poweredBy: "Azure AI Foundry",
        desc: "A Foundry Workflow that orchestrates multiple agents in sequence, with A2A handoffs visualised on a timeline.",
      },
      {
        title: "Foundry IQ",
        slug: "foundry-iq",
        status: "planned",
        tag: "Foundry IQ",
        poweredBy: "Azure AI Foundry",
        desc: "A standalone demo of Foundry IQ — showcases the feature in isolation so visitors see what makes it distinct.",
      },
    ],
  },
  {
    id: "genai",
    name: "Gen-AI",
    blurb:
      "Generative AI patterns: streaming, async, grounding, and memory across turns.",
    color: { fg: "#6b21a8", bg: "#e9d5ff", accent: "#7e22ce", tint: "#faf5ff" }, // plum
    tiles: [
      {
        title: "Raw Streaming Completion",
        slug: "raw-streaming-completion",
        status: "live",
        tag: "streaming · async",
        poweredBy: "Azure OpenAI",
        desc: "No agent framing — just the LLM. A sync vs async streaming comparison to show the primitive itself.",
        preview: 'Try: "Explain streaming in one sentence." — then flip sync/async.',
        modes: [
          { label: "async", value: "async" },
          { label: "sync", value: "sync" },
        ],
        guide: {
          greeting:
            "Give me anything to write or explain, then flip sync vs async to see how the tokens arrive. Or tap a suggested prompt.",
          about:
            "The baseline gen-AI primitive: a raw Azure OpenAI completion over the Responses API — no agent, no tools, no memory. Toggle sync vs async to see the difference. Same gpt-5-mini deployment as the Foundry Chat Agent.",
          tryThis: [
            "Explain what streaming a completion means, and why it matters for chat UIs.",
            "Write a short paragraph explaining what Azure OpenAI is to a non-engineer.",
            "Summarize what a token is and how models count them, in about four sentences.",
          ],
          expect: [
            "async: tokens stream in progressively, one chunk at a time.",
            "sync: nothing appears until the whole answer is ready, then it lands at once.",
            "Same text either way — the difference is when you see it, not what you get.",
          ],
          hood: [
            "async streams the Responses API deltas straight to the browser as they arrive.",
            "sync waits for the full completion on the server, then sends it in a single frame.",
            "The Next.js route calls Azure OpenAI directly; the key stays server-side, wrapped in withCostSafety.",
          ],
        },
      },
    ],
  },
  {
    id: "nl",
    name: "Natural Language",
    blurb:
      "Azure Language and Speech: text analysis, speech-capable apps, and translation.",
    color: { fg: "#166534", bg: "#bbf7d0", accent: "#15803d", tint: "#f0fdf4" }, // moss
    tiles: [
      {
        title: "Text Analysis Agent",
        slug: "text-analysis-agent",
        status: "live",
        tag: "sentiment · entities · PII",
        poweredBy: "Azure Language",
        desc: "Analyse text — sentiment, entities, key phrases, and PII redaction — with Azure AI Language, run as a tool inside a Foundry-hosted agent.",
        preview: 'Try: "I loved the hotel, but the food was disappointing."',
        guide: {
          greeting:
            "Paste any text and I'll analyse it — sentiment, entities, key phrases, or PII redaction. Or tap a suggested prompt.",
          about:
            "Paste any text and this agent breaks it down: the overall sentiment, the people, places, and organisations it mentions, and the key phrases that carry its meaning. It can also redact personal data — names, emails, phone numbers — so you can share or log text without leaking private details, which matters when the source is a support ticket, chat log, or document. It runs Azure AI Language as a tool inside a Foundry-hosted agent.",
          tryThis: [
            "The staff were lovely, but the room was filthy and the food arrived cold.",
            "Redact the personal details: Sara Lind booked a table for two — reach her on 070-123 45 67 or sara.lind@example.com.",
            "Microsoft was founded in 1975 by Bill Gates and Paul Allen in Albuquerque, New Mexico.",
          ],
          expect: [
            "Sentiment comes back as positive, neutral, or negative with a confidence score — and mixed text is flagged as mixed.",
            "Ask it to redact and personal data — names, emails, phone numbers — comes back masked, so nothing sensitive leaks.",
            "Named entities (people, places, organisations, dates) and the key phrases that summarise the text are pulled out and labelled.",
          ],
          hood: [
            "Azure AI Language does the analysis; the agent calls it as a tool and explains the result.",
            "Your text goes browser → Next.js route → Azure — the Azure key stays on the server, never in the browser.",
            "One agent, several Language operations — sentiment, entities, key phrases, PII redaction — picked to fit what you ask.",
          ],
        },
      },
      {
        title: "Speech Assistant",
        slug: "speech-assistant",
        status: "live",
        tag: "SSML · custom lexicon",
        poweredBy: "Azure Speech",
        model: "Azure Speech",
        desc: "Say something and see it written down. Type something and hear it read aloud — with names and codes pronounced properly.",
        preview: 'Try: "Nguyen is flying to Umeå."',
        guide: {
          about:
            "Say something, it writes down what it heard. Type something, it reads it out loud. It doesn't answer you. The voice has been taught to pronounce names and codes it would otherwise mangle.",
          tryThis: [
            "Nguyen is flying to Umeå, then Jönköping.",
            "Our team handles i18n and l10n for the whole product.",
            "STT and TTS are the two main parts of a speech service.",
          ],
          expect: [
            "\"STT\" and \"TTS\" read out in full, not spelled.",
            "\"i18n\" and \"l10n\" read as the words they stand for.",
            "\"Umeå\" said roughly \"OO-meh-oh\".",
            "Untaught words sound the same on both sides. That is the control.",
            "This training fixes speaking, not listening.",
          ],
          hood: [
            "Nothing extra installed. The site talks to Azure directly, which keeps it small and fast.",
            "The browser records in a format Azure will not accept. Rather than converting it on the server, the page decodes and resamples the audio itself using APIs the browser already ships. Nothing is stored, at either end.",
            "The pronunciation fixes live in a small XML file in this repo. The request points at its public URL, Azure fetches it, and caches it for fifteen minutes.",
            "Speech is billed per second of audio and per character spoken, so the token limit the chat tiles use would protect nothing here. This route caps 30 seconds in and 800 characters out, on its own daily budget.",
          ],
        },
      },
      {
        title: "Translation",
        slug: "translation",
        status: "planned",
        tag: "Foundry Tools",
        poweredBy: "Azure Translator",
        desc: "Translate text and speech using Microsoft Foundry Tools.",
      },
    ],
  },
  {
    id: "vision",
    name: "Insight Visual Data",
    blurb:
      "Azure AI Vision on Foundry: vision-enabled multimodal chat, image and video generation, Content Understanding, and Document Intelligence.",
    color: { fg: "#1e40af", bg: "#bfdbfe", accent: "#1d4ed8", tint: "#eff6ff" }, // steel blue
    tiles: [
      {
        title: "Vision Chat",
        slug: "vision-chat",
        status: "planned",
        tag: "multimodal · vision",
        poweredBy: "Azure AI Foundry",
        desc: "Drop in an image and ask about it. A vision-enabled chat agent that describes, reads, and reasons over what it sees.",
      },
      {
        title: "Generative Media",
        slug: "generative-media",
        status: "planned",
        tag: "image · video · toggle",
        poweredBy: "Azure AI Foundry",
        desc: "Generate an image or a short video from a text prompt. Toggle between Foundry's image and video models.",
      },
      {
        title: "Content Understanding",
        slug: "content-understanding",
        status: "planned",
        tag: "multimodal · extraction",
        poweredBy: "Azure Content Understanding",
        desc: "Pick the fields you want, upload any content, get it back structured. One analyzer across images, documents, audio, and video.",
      },
      {
        title: "Document Intelligence",
        slug: "document-intelligence",
        status: "planned",
        tag: "documents · layout · boxes",
        poweredBy: "Azure AI Document Intelligence",
        desc: "Upload a receipt, invoice, or ID and watch each field get boxed on the page — extraction with exact spatial layout, not just values.",
      },
    ],
  },
];

/** Live-tile count for a module, formatted as "0 / N live". */
export function liveCount(mod: Module): string {
  const live = mod.tiles.filter((t) => t.status === "live").length;
  return `${live} / ${mod.tiles.length} live`;
}

/** Resolve a playground by module id + tile slug. Returns null when the tile
 *  doesn't exist or has no guide yet (routes call notFound() on null). */
export function getPlaygroundData(moduleId: string, slug: string) {
  const index = modules.findIndex((m) => m.id === moduleId);
  if (index === -1) return null;
  const mod = modules[index];
  const tile = mod.tiles.find((t) => t.slug === slug);
  if (!tile || !tile.guide) return null;
  return { module: mod, tile, guide: tile.guide, chapter: index + 1 };
}
