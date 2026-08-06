/**
 * Undoes the keyboard's smart punctuation. iOS rewrites `"` to a curly `“` and `'` to `‘`
 * as you type, and Hermes' parser rejects both — a typed `console.log("a")` dies with
 * `unrecognized Unicode character “` while the backtick spelling runs fine. React Native
 * exposes no prop to switch that substitution off (`autoCorrect`/`spellCheck` don't cover it), so
 * the prompt reverses it on the way in, leaving the visible text the same as what actually runs.
 *
 * Smart dashes are deliberately left alone: iOS turns `--` into an en dash, but silently restoring
 * `a–b` to `a--b` would guess at intent, and a syntax error is better than the wrong operator.
 */
const SMART_PUNCTUATION: [RegExp, string][] = [
  [/[“”„‟]/g, '"'],
  [/[‘’‚‛]/g, "'"],
  [/ /g, ' '],
];

export function normalizeExpressionInput(source: string): string {
  return SMART_PUNCTUATION.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    source
  );
}
