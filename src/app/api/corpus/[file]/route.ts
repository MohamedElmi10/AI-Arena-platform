import { readFile } from "node:fs/promises";
import path from "node:path";

// GET /api/corpus/<file> — serves a RAG corpus file for the in-app source
// viewer (T-019 Part B). No Azure call here, so ADR-0001's withCostSafety wrap
// doesn't apply — this only reads a whitelisted repo file. The filename
// whitelist plus the in-directory check block path traversal (?file=../../.env).
export const runtime = "nodejs";

const CORPUS_DIR = path.join(
  process.cwd(),
  "src/app/agents/rag-agent-with-grounding-memory/corpus"
);
const VALID_FILE = /^(?:\d{2}-[a-z0-9-]+|README)\.md$/;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params;
  if (!VALID_FILE.test(file)) {
    return new Response("Not found", { status: 404 });
  }
  const full = path.join(CORPUS_DIR, file);
  if (path.dirname(full) !== CORPUS_DIR) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const text = await readFile(full, "utf8");
    return new Response(text, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
