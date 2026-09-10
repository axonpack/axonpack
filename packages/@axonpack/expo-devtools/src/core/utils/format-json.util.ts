/**
 * Pretty-printed when the text is a JSON object or array, and returned untouched when it is not.
 * The wire carries JSON minified, which is unreadable in a row and uneditable in a field — and every
 * caller here has text that is *probably* JSON rather than text that is known to be.
 */
export function formatJson(text: string): string {
  const trimmed = text.trim();
  // Cheaper than a throw, and it keeps a scalar payload (`123`, `"ok"`) exactly as it arrived.
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return text;
  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2);
  } catch {
    return text;
  }
}
