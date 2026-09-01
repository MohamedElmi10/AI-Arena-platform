// The words the Speech Assistant's custom lexicon has been taught.
//
// lexicon.xml is the source of truth — Azure fetches that file, not this list.
// This list exists so the playground knows when a before/after comparison is
// worth offering: if the text contains none of these words, both renderings are
// identical and showing two players would imply a difference that isn't there.
//
// lexicon.test.ts parses the XML and fails if the two ever drift apart.

/** Graphemes from src/app/nl/speech-assistant/lexicon.xml, in file order. */
export const TRAINED_WORDS = [
  "AI-103",
  "SSML",
  "STT",
  "TTS",
  "Göteborg",
  "Jönköping",
  "Nguyen",
  "i18n",
  "l10n",
  "Elmi",
] as const;

/**
 * Which trained words appear in `text`.
 *
 * Matching is case-sensitive on purpose: a custom lexicon lexeme is case
 * sensitive, so "ssml" genuinely would not be corrected and the playground
 * shouldn't claim otherwise.
 */
export function trainedWordsIn(text: string): string[] {
  return TRAINED_WORDS.filter((word) => text.includes(word));
}
