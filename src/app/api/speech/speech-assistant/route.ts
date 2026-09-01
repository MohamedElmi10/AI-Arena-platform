import { withCostSafety, type CostSafetyHandler } from "@/lib/cost-safety";

// POST /api/speech/speech-assistant — the runtime path for the Speech Assistant tile.
//
// The TypeScript twin of src/app/nl/speech-assistant/build.py, with two differences
// that are deliberate:
//
//  1. No SDK. The Speech SDK for JavaScript does not support compressed audio and
//     would pull a dependency in for two HTTP calls. Both operations are plain REST
//     POSTs, so this route uses fetch and adds nothing to package.json.
//  2. The browser converts its recording to 16 kHz mono PCM WAV before sending.
//     MediaRecorder produces WebM/Opus, which neither the SDK nor the REST API
//     accepts; the browser already ships an Opus decoder, so the conversion is free
//     there and impossible here (no ffmpeg in a serverless function).
//
// One endpoint, two operations, chosen by the request's content type:
//   application/json  { text }  ->  synthesised audio  (the mouth)
//   audio/wav         raw bytes ->  { text }           (the ear)
//
// Cost posture per docs/adr/0003-speech-cost-posture.md. Speech bills per audio
// second in and per character out, so ADR-0001's token cap guards nothing here —
// the two constants below are the real bounds, and both are checked before any
// Azure call so a rejected request costs nothing.
export const runtime = "nodejs";

/** ADR-0003. A 30 s clip at 16 kHz mono 16-bit is exactly 960,000 bytes. */
const MAX_AUDIO_SECONDS = 30;
const WAV_BYTES_PER_SECOND = 16000 * 2; // 16 kHz, mono, 16-bit
const MAX_AUDIO_BYTES = MAX_AUDIO_SECONDS * WAV_BYTES_PER_SECOND;

/** ADR-0003. ~$0.013 of synthesis at the worst case. */
const MAX_SYNTHESIS_CHARS = 800;

const VOICE = "en-US-JennyNeural";
const RECOGNITION_LANGUAGE = "en-US";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function fail(error: string, message: string, status: number): Response {
  return json({ error, message }, status);
}

function env() {
  const key = process.env.SPEECH_KEY;
  const region = process.env.SPEECH_REGION;
  const lexicon = process.env.LEXICON_URI;
  if (!key || !region) throw new Error("SPEECH_KEY / SPEECH_REGION are not set");
  return { key, region, lexicon };
}

/** XML-escape text destined for an SSML document. */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Wrap text in SSML pointing at the custom lexicon. The <lexicon/> element must sit
 * INSIDE <voice>, and the voice named here overrides any service-side default.
 * Mirrors build_ssml() in build.py.
 */
export function buildSsml(text: string, lexiconUri?: string): string {
  const lexicon = lexiconUri ? `<lexicon uri="${escapeXml(lexiconUri)}"/>` : "";
  return (
    '<speak version="1.0" ' +
    'xmlns="http://www.w3.org/2001/10/synthesis" ' +
    'xml:lang="en-US">' +
    `<voice name="${VOICE}">` +
    lexicon +
    `<prosody rate="-8%">${escapeXml(text)}</prosody>` +
    "</voice>" +
    "</speak>"
  );
}

// --- the mouth: text -> audio ------------------------------------------------
async function synthesize(req: Request): Promise<Response> {
  let text: unknown;
  let lexicon: unknown = true;
  try {
    ({ text, lexicon = true } = await req.json());
  } catch {
    return fail("bad_request", "Send { text: string } as JSON.", 400);
  }

  if (typeof text !== "string" || text.trim() === "") {
    return fail("bad_request", "Send a non-empty { text: string }.", 400);
  }

  // ADR-0003 cap. Before any Azure call, so a rejection is free.
  if (text.length > MAX_SYNTHESIS_CHARS) {
    return fail(
      "too_long",
      `This demo speaks up to ${MAX_SYNTHESIS_CHARS} characters at a time. Yours is ${text.length}.`,
      413
    );
  }

  // lexicon:false renders the same sentence with no pronunciation guide, so the
  // playground can play an untrained/trained pair. That contrast IS the tile.
  const { key, region, lexicon: lexiconUri } = env();
  const useLexicon = lexicon !== false;

  const res = await fetch(
    `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "ai-arena-speech-assistant", // required by the TTS API
      },
      body: buildSsml(text, useLexicon ? lexiconUri : undefined),
    }
  );

  if (!res.ok) {
    console.error("[speech] synthesis failed:", res.status, await res.text());
    return fail("speech_error", "Couldn't speak that. Please try again.", 502);
  }

  return new Response(await res.arrayBuffer(), {
    headers: {
      "content-type": "audio/mpeg",
      "cache-control": "no-store",
      // So the playground can show the exact markup that produced the audio.
      "x-ssml-lexicon": useLexicon && lexiconUri ? "applied" : "absent",
    },
  });
}

// --- the ear: audio -> text --------------------------------------------------
async function transcribe(req: Request): Promise<Response> {
  const audio = await req.arrayBuffer();

  if (audio.byteLength === 0) {
    return fail("bad_request", "Send WAV audio as the request body.", 400);
  }

  // ADR-0003 cap, as a byte length — 16 kHz mono 16-bit is a fixed 32 kB/s, so
  // this is an exact duration check without parsing the file.
  if (audio.byteLength > MAX_AUDIO_BYTES) {
    return fail(
      "too_long",
      `This demo listens for ${MAX_AUDIO_SECONDS} seconds at a time.`,
      413
    );
  }

  const { key, region } = env();
  const res = await fetch(
    `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${RECOGNITION_LANGUAGE}`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
        Accept: "application/json",
      },
      body: audio,
    }
  );

  if (!res.ok) {
    console.error("[speech] recognition failed:", res.status, await res.text());
    return fail("speech_error", "Couldn't hear that. Please try again.", 502);
  }

  // The REST API reports failure in the body, not the status — same shape as the
  // SDK's ResultReason, and the same reason it must be checked.
  const body = (await res.json()) as {
    RecognitionStatus?: string;
    DisplayText?: string;
  };

  if (body.RecognitionStatus !== "Success") {
    const friendly: Record<string, string> = {
      NoMatch: "I heard audio but couldn't make out any words.",
      InitialSilenceTimeout: "I didn't hear anything — try again and speak up.",
      BabbleTimeout: "Too much background noise to make that out.",
    };
    return json({
      text: "",
      status: body.RecognitionStatus ?? "Error",
      message:
        friendly[body.RecognitionStatus ?? ""] ?? "Couldn't recognise that.",
    });
  }

  return json({ text: body.DisplayText ?? "", status: "Success" });
}

const handler: CostSafetyHandler = async (req) => {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) return synthesize(req);
  if (contentType.includes("audio/wav")) return transcribe(req);

  return fail(
    "bad_request",
    "Send application/json { text } to speak, or audio/wav bytes to transcribe.",
    415
  );
};

// ADR-0003: a dedicated 100/day budget key, so speech can't drain the chat budget.
export const POST = withCostSafety(handler, { limit: 100, key: "speech" });
