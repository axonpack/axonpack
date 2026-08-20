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
