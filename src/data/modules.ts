// Single source of truth for the landing wall.
// Modules and tiles live here; flipping a tile from 'planned' to 'live'
// is a data edit, not a code edit (see docs/CONTEXT.md §Tile State).

export type TileStatus = "live" | "planned";

export type Tile = {
  title: string;
  status: TileStatus;
  /** Short mono-font label, e.g. "streaming" or "RAG · grounding · memory". */
  tag: string;
  /** One-line description shown in the "planned" modal. */
  desc: string;
  /** Example prompt revealed on hover for live tiles (added when a tile ships). */
  preview?: string;
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
        status: "planned",
        tag: "streaming",
        desc: "A simple Foundry-hosted chat agent. Streams responses token-by-token.",
      },
      {
        title: "Function-Calling Agent",
        status: "planned",
        tag: "tools · async",
        desc: "A chatbot that calls tools to get things done. Demonstrates function calling and async patterns.",
      },
      {
        title: "RAG Agent with Grounding & Memory",
        status: "planned",
        tag: "RAG · grounding · memory",
        desc: "Retrieval-augmented generation with grounded citations and memory that persists across turns.",
      },
      {
        title: "MCP Agent (Hosted + Own)",
        status: "planned",
        tag: "MCP",
        desc: "Toggle between calling a Microsoft-hosted MCP server and my own MCP server. Same task, two implementations.",
      },
      {
        title: "Microsoft Agent Framework Agent",
        status: "planned",
        tag: "MAF",
        desc: "The same agent built with Microsoft Agent Framework instead of Foundry-native, so the pattern differences are visible.",
      },
      {
        title: "Multi-Agent Orchestration",
        status: "planned",
        tag: "workflow · A2A · sequential",
        desc: "A Foundry Workflow that orchestrates multiple agents in sequence, with A2A handoffs visualised on a timeline.",
      },
      {
        title: "Foundry IQ",
        status: "planned",
        tag: "Foundry IQ",
        desc: "A standalone demo of Foundry IQ — showcases the feature in isolation so the recruiter sees what makes it distinct.",
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
        status: "planned",
        tag: "streaming · async",
        desc: "No agent framing — just the LLM. A side-by-side sync vs async streaming comparison to show the primitive itself.",
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
        status: "planned",
        tag: "Azure Language · MCP",
        desc: "Analyse text (sentiment, entities, key phrases) two ways: via Azure Language in Foundry Tools, and via the Azure Language MCP server.",
      },
      {
        title: "Speech Assistant",
        status: "planned",
        tag: "Azure Speech · MCP",
        desc: "A speech-capable gen-AI app plus a Speech agent via the Azure Speech MCP server. Toggle implementations.",
      },
      {
        title: "Translation",
        status: "planned",
        tag: "Foundry Tools",
        desc: "Translate text and speech using Microsoft Foundry Tools.",
      },
    ],
  },
  // Future — Insight Visual Data (Azure AI Vision). Not part of MVP; lands as a
  // 4th module once studied. The landing must accommodate it without a redesign.
  // {
  //   id: "vision",
  //   name: "Insight Visual Data",
  //   blurb: "Azure AI Vision: image analysis, OCR, and visual grounding.",
  //   color: { fg: "", bg: "", accent: "", tint: "" }, // TBD
  //   tiles: [],
  // },
];

/** Live-tile count for a module, formatted as "0 / N live". */
export function liveCount(mod: Module): string {
  const live = mod.tiles.filter((t) => t.status === "live").length;
  return `${live} / ${mod.tiles.length} live`;
}
