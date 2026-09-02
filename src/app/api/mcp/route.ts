import { modules } from "@/data/modules";

// POST /api/mcp — AI Arena's own MCP server.
//
// The other half of the MCP tile calls GitHub's server to answer "what changed?".
// This one answers "what shipped?" — and it can, because it IS the site. It
// imports data/modules.ts the same way the landing page does, so there is no
// copy to keep in sync and no snapshot to go stale. Deploy the site, the server
// is current.
//
// Why this is a plain JSON route and not a streaming one: the MCP spec says a
// server receiving a JSON-RPC request MUST return either text/event-stream or
// "application/json, to return one JSON object", and that clients MUST support
// both. Sessions are optional (the spec says MAY). So a stateless request/reply
// route is fully compliant — no SDK, no streaming, no session store.
//
// Not wrapped in withCostSafety: that middleware exists to bound Azure spend, and
// nothing here calls Azure. It reads an object that is already in the bundle.
export const runtime = "nodejs";

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_NAME = "ai-arena";

/** Origins allowed to call this from a browser. The spec requires we check. */
const ALLOWED_ORIGINS = [
  "https://aiarena-mohamed-elmi.netlify.app",
  "http://localhost:3000",
];

type JsonRpcId = string | number | null;

function result(id: JsonRpcId, value: unknown) {
  return Response.json({ jsonrpc: "2.0", id, result: value });
}

function error(id: JsonRpcId, code: number, message: string) {
  return Response.json({ jsonrpc: "2.0", id, error: { code, message } });
}

// --- the tools ---------------------------------------------------------------

const TOOLS = [
  {
    name: "list_tiles",
    description:
      "List the demos (tiles) on AI Arena, optionally filtered by status or module. " +
      "Use this to answer what is built, what is live, or what is still planned.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["live", "planned"],
          description: "Only tiles with this status.",
        },
        module: {
          type: "string",
          description: 'Module id, e.g. "agents" or "nl".',
        },
      },
    },
  },
  {
    name: "get_arena_summary",
    description:
      "Counts and totals for AI Arena: how many tiles exist, how many are live, " +
      "and which Azure services they are built on.",
    inputSchema: { type: "object", properties: {} },
  },
] as const;

function listTiles(args: { status?: string; module?: string }) {
  return modules
    .filter((m) => !args.module || m.id === args.module)
    .flatMap((m) =>
      m.tiles
        .filter((t) => !args.status || t.status === args.status)
        .map((t) => ({
          title: t.title,
          slug: t.slug,
          module: m.name,
          status: t.status,
          tag: t.tag,
          poweredBy: t.poweredBy,
          summary: t.desc,
        }))
    );
}

function arenaSummary() {
  const tiles = modules.flatMap((m) => m.tiles);
  const live = tiles.filter((t) => t.status === "live");
  return {
    totalTiles: tiles.length,
    live: live.length,
    planned: tiles.length - live.length,
    modules: modules.map((m) => ({
      name: m.name,
      tiles: m.tiles.length,
      live: m.tiles.filter((t) => t.status === "live").length,
    })),
    azureServices: [...new Set(tiles.map((t) => t.poweredBy))].sort(),
    liveTiles: live.map((t) => t.title),
  };
}

/** MCP wants tool output as content blocks, not a bare value. */
function toolResult(value: unknown) {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
  };
}

// --- transport ---------------------------------------------------------------

export async function POST(req: Request) {
  // The spec: "Servers MUST validate the Origin header on all incoming
  // connections to prevent DNS rebinding attacks." Server-to-server callers like
  // Foundry send no Origin at all, which is fine — we only reject a browser
  // origin we don't know.
  const origin = req.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new Response("Forbidden origin", { status: 403 });
  }

  const version = req.headers.get("mcp-protocol-version");
  if (version && version > PROTOCOL_VERSION) {
    return new Response("Unsupported MCP-Protocol-Version", { status: 400 });
  }

  let body: { jsonrpc?: string; id?: JsonRpcId; method?: string; params?: unknown };
  try {
    body = await req.json();
  } catch {
    return error(null, -32700, "Parse error");
  }

  const { id = null, method, params } = body;

  // A notification has no id. The spec: reply 202 Accepted with no body.
  if (id === null && method?.startsWith("notifications/")) {
    return new Response(null, { status: 202 });
  }

  switch (method) {
    case "initialize":
      return result(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: SERVER_NAME, version: "1.0.0" },
        instructions:
          "Answers questions about AI Arena itself — which demos exist, which are " +
          "live, and what they are built on. The data comes from the site's own " +
          "source, so it is current as of the latest deploy.",
      });

    case "tools/list":
      return result(id, { tools: TOOLS });

    case "tools/call": {
      const { name, arguments: args = {} } = (params ?? {}) as {
        name?: string;
        arguments?: Record<string, string>;
      };

      if (name === "list_tiles") return result(id, toolResult(listTiles(args)));
      if (name === "get_arena_summary") return result(id, toolResult(arenaSummary()));

      return error(id, -32602, `Unknown tool: ${name}`);
    }

    case "ping":
      return result(id, {});

    default:
      return error(id, -32601, `Method not found: ${method}`);
  }
}

// The spec allows a server with no server-initiated messages to refuse GET:
// "MUST either return Content-Type: text/event-stream ... or else return HTTP
// 405 Method Not Allowed."
export function GET() {
  return new Response("This MCP endpoint does not offer an SSE stream.", {
    status: 405,
  });
}
