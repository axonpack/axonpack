function escapeSingleQuoted(value: string): string {
  return value.replace(/'/g, `'\\''`);
}

type CurlSource = {
  method: string;
  url: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
};

/** A copy-pasteable curl command for the request — the "Copy as cURL" item from ROADMAP.md.
 * Takes just the fields it needs so it works for a real log entry or the sandbox's draft state. */
export function buildCurlCommand(entry: CurlSource): string {
  const lines = [`curl -X ${entry.method} '${escapeSingleQuoted(entry.url)}'`];
  for (const [key, value] of Object.entries(entry.requestHeaders ?? {})) {
    lines.push(`  -H '${escapeSingleQuoted(key)}: ${escapeSingleQuoted(value)}'`);
  }
  if (entry.requestBody) {
    lines.push(`  --data-raw '${escapeSingleQuoted(entry.requestBody)}'`);
  }
  return lines.join(' \\\n');
}
