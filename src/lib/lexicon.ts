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
  "STT",
  "TTS",
  "Umeå",
  "Jönköping",
  "Nguyen",
  "i18n",
  "l10n",
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

/**
 * Trained words the text nearly matches — right letters, wrong case.
 *
 * A lexeme really is case sensitive, so "stt" is not corrected and offering a
 * comparison for it would show two identical clips. Catching the near-miss lets
 * the playground say why instead of looking broken.
 */
export function nearMissesIn(text: string): string[] {
  const lower = text.toLowerCase();
  return TRAINED_WORDS.filter(
    (word) => !text.includes(word) && lower.includes(word.toLowerCase())
  );
}
