import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { nearMissesIn, TRAINED_WORDS, trainedWordsIn } from "./lexicon";

// The playground decides whether to offer a before/after comparison from
// TRAINED_WORDS, but Azure reads lexicon.xml. If the two drift, the tile either
// hides a real difference or promises one that doesn't exist. This test is the
// thing that stops that happening quietly.
const xml = readFileSync(
  join(process.cwd(), "src/app/nl/speech-assistant/lexicon.xml"),
  "utf8"
);

const graphemes = [...xml.matchAll(/<grapheme>([^<]+)<\/grapheme>/g)].map(
  (m) => m[1]
);

describe("lexicon.xml stays in sync with TRAINED_WORDS", () => {
  it("finds entries in the XML at all", () => {
    expect(graphemes.length).toBeGreaterThan(0);
  });

  it("lists exactly the same words, in the same order", () => {
    expect(graphemes).toEqual([...TRAINED_WORDS]);
  });
});

describe("trainedWordsIn", () => {
  it("finds a taught word in a sentence", () => {
    expect(trainedWordsIn("I flew to Umeå last week")).toEqual(["Umeå"]);
  });

  it("finds several", () => {
    expect(trainedWordsIn("Nguyen works on i18n and l10n")).toEqual([
      "Nguyen",
      "i18n",
      "l10n",
    ]);
  });

  it("returns nothing for untaught text, so no comparison is offered", () => {
    expect(trainedWordsIn("the quick brown fox")).toEqual([]);
  });

  it("is case sensitive, matching how a lexeme actually behaves", () => {
    expect(trainedWordsIn("stt")).toEqual([]);
    expect(trainedWordsIn("STT")).toEqual(["STT"]);
  });
});

describe("nearMissesIn", () => {
  it("spots the right letters in the wrong case", () => {
    expect(nearMissesIn("stt")).toEqual(["STT"]);
  });

  it("stays quiet when the case is already right", () => {
    expect(nearMissesIn("STT")).toEqual([]);
  });

  it("stays quiet for unrelated text", () => {
    expect(nearMissesIn("hello there")).toEqual([]);
  });
});
