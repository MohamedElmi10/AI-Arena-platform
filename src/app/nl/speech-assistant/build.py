"""
build.py — Speech Assistant (AI Arena · Natural Language module)

Dev-time proof that the Speech SDK round-trip works. Not run by the Next.js app.
Built on the Speech SDK directly, not a Foundry-hosted agent (see T-025).

FLOW
  A. ear    mic ─► recognizer ─► text
  B. mouth  text ─► SSML (+ lexicon) ─► audio
  C. both   mic ─► TranslationRecognizer ─► translated audio, one call

ENV (.env at the repo root, gitignored — never committed)
  SPEECH_KEY, SPEECH_REGION            # region is a short name: "northeurope"
  LEXICON_URI                          # public raw URL to lexicon.xml

RUN
  pip install azure-cognitiveservices-speech python-dotenv
  python src/app/nl/speech-assistant/build.py

Caps live in the Next.js route (ADR-0003), not here. Keep test clips short.
"""

# TODO 1 — imports + env
#   os, dotenv.load_dotenv, and `azure.cognitiveservices.speech as speechsdk`.
#   Read the three env vars. Note: key auth here, not DefaultAzureCredential.
import os
import dotenv
import azure.cognitiveservices.speech as speechsdk
from xml.sax.saxutils import escape

dotenv.load_dotenv()
SPEECH_KEY = os.getenv("SPEECH_KEY")
SPEECH_REGION = os.getenv("SPEECH_REGION")
LEXICON_URI = os.getenv("LEXICON_URI")

# TODO 2 — SpeechConfig
#   One config drives both directions: subscription + region.
#   Set speech_synthesis_voice_name on it for Part B (e.g. en-US-JennyNeural).

speech_config = speechsdk.SpeechConfig(subscription=SPEECH_KEY, region=SPEECH_REGION)
speech_config.speech_synthesis_voice_name = "en-US-JennyNeural"  # TODO: choose a voice

# ── A. the ear ─────────────────────────────────────────────────────
# TODO 3 — recognize_from_mic()
#
#   Step 1. Say which microphone to use.
#           audio_config = speechsdk.audio.AudioConfig(use_default_microphone=True)
#           Note the `audio` submodule — AudioConfig is not top-level.
def recognize_from_mic():
    audio_config = speechsdk.audio.AudioConfig(use_default_microphone=True)
    recognizer = speechsdk.SpeechRecognizer(
        speech_config=speech_config, audio_config=audio_config
    )
    print("Speak now...")
    result = recognizer.recognize_once_async().get()

    if result.reason == speechsdk.ResultReason.RecognizedSpeech:
        print(result.text)                       # the words
    elif result.reason == speechsdk.ResultReason.NoMatch:
        print(result.no_match_details)           # why nothing was understood
    elif result.reason == speechsdk.ResultReason.Canceled:
        d = result.cancellation_details          # one level deeper
        print(d.reason, d.error_details)         # the real failure
    return result


audio_output = speechsdk.audio.AudioOutputConfig(use_default_speaker=True)
synth = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_output)


def speak_plain(text):
    result = synth.speak_text_async(text).get()
    if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
        print("spoke plain")
    elif result.reason == speechsdk.ResultReason.Canceled:
        d = result.cancellation_details
        print(d.reason, d.error_details)
    return result


def build_ssml(text):
    """Wrap `text` in SSML that points at the custom lexicon."""
    if not LEXICON_URI:
        raise SystemExit("LEXICON_URI is not set — the lexicon is fetched over the network.")
    voice = speech_config.speech_synthesis_voice_name
    return (
        '<speak version="1.0" '
        'xmlns="http://www.w3.org/2001/10/synthesis" '
        'xml:lang="en-US">'
        f'<voice name="{voice}">'
        f'<lexicon uri="{LEXICON_URI}"/>'
        f'<prosody rate="-8%">{escape(text)}</prosody>'
        "</voice>"
        "</speak>"
    )


def speak_ssml(text):
    ssml = build_ssml(text)
    result = synth.speak_ssml_async(ssml).get()
    if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
        print("spoke with lexicon")
    elif result.reason == speechsdk.ResultReason.Canceled:
        d = result.cancellation_details
        print(d.reason, d.error_details)
    return result


TEST_LINE = "Mohamed Elmi is AI-103 certified, and SSML fixes pronunciation."

# speak_ssml(TEST_LINE)   # uncomment once LEXICON_URI is set


# ── C. both at once ──────────────────────────────────────────────────────────
# TODO 6 — translate_from_mic()
#
#   Step 1. A different config class, and it lives in a submodule. This REPLACES
#           speech_config for this part — it does not sit alongside it.
#             tcfg = speechsdk.translation.SpeechTranslationConfig(
#                        subscription=SPEECH_KEY, region=SPEECH_REGION)
#
#   Step 2. Set three things. Watch the formats — they are not the same shape:
#             tcfg.speech_recognition_language = "en-US"      # locale  (what you speak)
#             tcfg.add_target_language("sv")                  # SHORT code (what you want)
#             tcfg.voice_name = "sv-SE-SofieNeural"           # full voice name, and it
#                                                             # must match the target language
#
#   Step 3. The recognizer is in the same submodule:
#             rec = speechsdk.translation.TranslationRecognizer(
#                       translation_config=tcfg, audio_config=...)
#
#   Step 4. result = rec.recognize_once_async().get()
#             reason label here is ResultReason.TranslatedSpeech
#             result.text               → what you said, source language
#             result.translations["sv"] → the translation, keyed by the code you added
#
#   Step 5. The AUDIO is not on the result. Setting voice_name is not enough on its
#           own — you subscribe to an event, and you must do it BEFORE recognizing:
#             rec.synthesizing.connect(handler)     # handler gets evt.result.audio
#           Write those bytes to a .wav or play them. This works with exactly ONE
#           target language — add a second and the event stops firing.
#
#   Step 6. Notice what you did NOT build: no Translator resource, no second call,
#           no stitching text between two services. That is the point of Part C.


# TODO 7 — main()
#
#   Step 1. input() a letter: A, B or C.
#   Step 2. Call the matching function and print what came back.
#   Step 3. Loop so you can try several without restarting.
#
#   Keep it dumb — no argparse, no classes. This is a test harness, not a product.


def translate_from_mic(source="en-US", target="sv", voice="sv-SE-SofieNeural"):
    """One recognizer: hears `source`, returns text + speaks `target`."""
    tcfg = speechsdk.translation.SpeechTranslationConfig(
        subscription=SPEECH_KEY, region=SPEECH_REGION
    )
    tcfg.speech_recognition_language = source   # locale, e.g. "en-US"
    tcfg.add_target_language(target)            # short code, e.g. "sv"
    tcfg.voice_name = voice                     # full voice name, must match target

    audio_in = speechsdk.audio.AudioConfig(use_default_microphone=True)
    rec = speechsdk.translation.TranslationRecognizer(
        translation_config=tcfg, audio_config=audio_in
    )

    # The spoken translation does NOT come back on the result — it arrives in
    # pieces on this event, and you must subscribe before recognising.
    chunks = []
    rec.synthesizing.connect(lambda evt: chunks.append(evt.result.audio))

    print(f"Speak {source} now...")
    result = rec.recognize_once_async().get()

    if result.reason == speechsdk.ResultReason.TranslatedSpeech:
        print("you said  :", result.text)
        print("translated:", result.translations[target])
        audio = b"".join(c for c in chunks if c)
        if audio:
            out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "translation.wav")
            with open(out, "wb") as f:
                f.write(audio)
            print("spoken translation written to", out)
    elif result.reason == speechsdk.ResultReason.NoMatch:
        print(result.no_match_details)
    elif result.reason == speechsdk.ResultReason.Canceled:
        d = result.cancellation_details
        print(d.reason, d.error_details)
    return result


def main():
    actions = {
        "A": ("ear    — speak, see the text", lambda: recognize_from_mic()),
        "B": ("mouth  — plain text, no lexicon", lambda: speak_plain(TEST_LINE)),
        "C": ("mouth  — SSML + custom lexicon", lambda: speak_ssml(TEST_LINE)),
        "D": ("both   — speak English, hear Swedish", lambda: translate_from_mic()),
    }
    while True:
        print()
        for key, (label, _) in actions.items():
            print(f"  {key}. {label}")
        choice = input("pick (Q to quit) > ").strip().upper()
        if choice == "Q":
            return
        entry = actions.get(choice)
        if entry is None:
            print("pick A, B, C, D or Q")
            continue
        try:
            entry[1]()
        except SystemExit as e:
            print(e)


if __name__ == "__main__":
    main()
