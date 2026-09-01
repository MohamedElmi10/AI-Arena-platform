"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { Module, Tile, TileGuide } from "@/data/modules";
import { PlaygroundHeader } from "@/components/playground/PlaygroundHeader";
import { PlaygroundGuide } from "@/components/playground/PlaygroundGuide";
import { SiteFooter } from "@/components/SiteFooter";
import { TRAINED_WORDS, trainedWordsIn } from "@/lib/lexicon";

// The Speech Assistant playground. Unlike the other tiles this is not a chat, so
// it doesn't use <Playground> — it reuses the header, guide and footer and owns
// its own body (record → transcribe → edit → speak).
//
// The one interesting bit is toWav16k(). MediaRecorder produces WebM/Opus, which
// neither the Speech SDK nor the REST API accepts, and a serverless function has
// no ffmpeg. The browser already ships an Opus decoder — that's how it plays the
// file — so decodeAudioData() unpacks it, OfflineAudioContext resamples to the
// 16 kHz mono the service wants, and we write the WAV header by hand. No library,
// and nothing to convert server-side.

/** ADR-0003: the server rejects anything longer, so stop before we get there. */
const MAX_SECONDS = 30;
const MAX_CHARS = 800;
const TARGET_RATE = 16000;

type Phase = "idle" | "recording" | "transcribing" | "speaking";

function writeAscii(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
}

/** WebM/Opus blob → 16 kHz mono 16-bit PCM WAV, entirely in the browser. */
async function toWav16k(blob: Blob): Promise<ArrayBuffer> {
  const Ctx = window.AudioContext ?? (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  void ctx.close();

  // Resample to 16 kHz mono by rendering through an offline graph.
  const frames = Math.max(1, Math.ceil(decoded.duration * TARGET_RATE));
  const offline = new OfflineAudioContext(1, frames, TARGET_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();

  const samples = rendered.getChannelData(0);
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true); // subchunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, TARGET_RATE, true);
  view.setUint32(28, TARGET_RATE * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeAscii(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

type Props = {
  module: Module;
  tile: Tile;
  guide: TileGuide;
  chapter: number;
};

export function SpeechPlayground({ module, tile, guide, chapter }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [text, setText] = useState("");
  const [transcript, setTranscript] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [clips, setClips] = useState<{ before?: string; after?: string }>({});
  const [pending, setPending] = useState<"before" | "after" | null>(null);
  const [latency, setLatency] = useState("—");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const accentVars = {
    "--accent": module.color.accent,
    "--accent-fg": module.color.fg,
    "--accent-pale": module.color.bg,
    "--accent-tint": module.color.tint,
  } as CSSProperties;

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      Object.values(clips).forEach((u) => u && URL.revokeObjectURL(u));
    },
    [clips]
  );

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  async function startRecording() {
    setNote(null);
    setTranscript(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setNote("I can't reach your microphone — check the browser's permission prompt.");
      return;
    }

    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      setSeconds(0);
      setPhase("transcribing");

      try {
        const wav = await toWav16k(new Blob(chunksRef.current, { type: "audio/webm" }));
        const started = performance.now();
        const res = await fetch("/api/speech/speech-assistant", {
          method: "POST",
          headers: { "content-type": "audio/wav" },
          body: wav,
        });
        setLatency(`${Math.round(performance.now() - started)}ms`);
        const body = await res.json();

        if (!res.ok) setNote(body.message ?? "Something went wrong.");
        else if (body.text) setTranscript(body.text);
        else setNote(body.message ?? "I didn't catch that.");
      } catch {
        setNote("Couldn't process that recording. Try again.");
      } finally {
        setPhase("idle");
      }
    };

    recorder.start();
    setPhase("recording");
    setSeconds(0);
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS) stopRecording();
        return s + 1;
      });
    }, 1000);
  }

  async function speak(trained: boolean) {
    if (!text.trim() || phase !== "idle") return;
    const which = trained ? "after" : "before";
    setNote(null);
    setPhase("speaking");
    setPending(which);
    const started = performance.now();

    try {
      const res = await fetch("/api/speech/speech-assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // lexicon:false renders the same sentence with no pronunciation guide.
        body: JSON.stringify({ text, lexicon: trained }),
      });
      setLatency(`${Math.round(performance.now() - started)}ms`);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setNote(body.message ?? "Couldn't speak that.");
        return;
      }

      const url = URL.createObjectURL(await res.blob());
      setClips((c) => {
        if (c[which]) URL.revokeObjectURL(c[which] as string);
        return { ...c, [which]: url };
      });
      void new Audio(url).play();
    } catch {
      setNote("Couldn't reach the speech service.");
    } finally {
      setPhase("idle");
      setPending(null);
    }
  }

  // Only offer the comparison when the text actually contains a taught word —
  // otherwise both renderings are identical and two players imply a lie.
  const taught = trainedWordsIn(text);
  const comparable = taught.length > 0;

  const recording = phase === "recording";
  const busy = phase === "transcribing" || phase === "speaking";

  return (
    <main className="paper min-h-full flex-1" style={accentVars}>
      <div className="mx-auto max-w-6xl px-6 pb-10">
        <div className="pt-10">
          <PlaygroundHeader
            chapterLabel={`Chapter ${String(chapter).padStart(2, "0")} · ${module.name}`}
            moduleName={module.name}
            title={tile.title}
            tagline={tile.desc}
            poweredBy={tile.poweredBy}
            model={tile.model ?? "Azure Speech"}
            tokens={text.length}
            latency={latency}
            status={busy || recording ? "streaming" : "idle"}
          />
        </div>

        <div className="grid grid-cols-12 gap-8">
          <PlaygroundGuide guide={guide} onInsert={setText} />

          <section className="col-span-12 space-y-5 md:col-span-7">
            {/* The ear */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-[color:var(--accent)]">
                The ear · your voice becomes text
              </div>
              <p className="mb-4 text-sm text-neutral-600">
                Record up to {MAX_SECONDS} seconds. Your browser converts the audio
                before it&apos;s sent — nothing is stored.
              </p>
              <button
                onClick={recording ? stopRecording : startRecording}
                disabled={busy}
                className="rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 font-medium text-white disabled:opacity-40"
              >
                {recording ? `Stop (${MAX_SECONDS - seconds}s)` : "Record"}
              </button>
              {phase === "transcribing" && (
                <span className="ml-3 text-sm text-neutral-500">listening back…</span>
              )}

              {transcript !== null && (
                <div className="mt-4">
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                    What it heard
                  </div>
                  <p className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-800">
                    {transcript}
                  </p>
                  <button
                    onClick={() => setText(transcript)}
                    className="mt-2 text-xs font-medium text-[color:var(--accent)] underline underline-offset-2"
                  >
                    Send this down to be spoken →
                  </button>
                </div>
              )}
            </div>

            {/* The mouth */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-[color:var(--accent)]">
                The mouth · text becomes speech
              </div>
              <p className="mb-3 text-sm text-neutral-600">
                Type anything and hear it read aloud. Include a word this voice has
                been taught and you can play it both ways — same sentence, same
                voice, the only difference being the pronunciation guide.
              </p>
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value.slice(0, MAX_CHARS));
                  // The old pair no longer matches the text, so don't offer it.
                  setClips((c) => {
                    Object.values(c).forEach((u) => u && URL.revokeObjectURL(u));
                    return {};
                  });
                }}
                rows={3}
                placeholder="Type something, or tap a taught word below…"
                className="w-full resize-none rounded-lg border border-neutral-300 p-3 text-sm focus:border-[var(--accent)] focus:outline-none"
              />

              {comparable ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {(["before", "after"] as const).map((which) => {
                    const trained = which === "after";
                    const url = clips[which];
                    return (
                      <div
                        key={which}
                        className={`rounded-lg border p-3 ${
                          trained
                            ? "border-[var(--accent)] bg-[var(--accent-tint)]"
                            : "border-neutral-200"
                        }`}
                      >
                        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                          {trained ? "After training" : "Before training"}
                        </div>
                        <button
                          onClick={() => speak(trained)}
                          disabled={busy || recording || !text.trim()}
                          className={`w-full rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-40 ${
                            trained
                              ? "bg-[var(--accent)] text-white"
                              : "border border-neutral-300 bg-white text-neutral-700"
                          }`}
                        >
                          {pending === which
                            ? "Speaking…"
                            : url
                              ? "Play again"
                              : "Play"}
                        </button>
                        {url && (
                          <audio controls src={url} className="mt-2 h-8 w-full" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-3">
                  <button
                    onClick={() => speak(true)}
                    disabled={busy || recording || !text.trim()}
                    className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
                  >
                    {pending ? "Speaking…" : "Play"}
                  </button>
                  {clips.after && (
                    <audio controls src={clips.after} className="mt-2 h-8 w-full max-w-sm" />
                  )}
                  <p className="mt-3 text-xs text-neutral-500">
                    Nothing here has been taught to this voice, so there is no
                    before-and-after to hear. Try one of these:
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {TRAINED_WORDS.map((word) => (
                      <button
                        key={word}
                        onClick={() => setText(word)}
                        className="rounded-full border border-neutral-300 px-2.5 py-1 font-mono text-xs text-neutral-700 hover:border-[var(--accent)] hover:text-[color:var(--accent)]"
                      >
                        {word}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-2 text-right font-mono text-xs text-neutral-400">
                {text.length}/{MAX_CHARS}
              </div>
            </div>

            {note && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                {note}
              </div>
            )}
          </section>
        </div>

        <SiteFooter />
      </div>
    </main>
  );
}
