import type { NetworkLogEntry } from '../../stores/network/network-log.store';

function escapeSingleQuoted(value: string): string {
  return value.replace(/'/g, `'\\''`);
}

/** A copy-pasteable curl command for the request — the "Copy as cURL" item from ROADMAP.md. */
export function buildCurlCommand(entry: NetworkLogEntry): string {
  const lines = [`curl -X ${entry.method} '${escapeSingleQuoted(entry.url)}'`];
  for (const [key, value] of Object.entries(entry.requestHeaders ?? {})) {
    lines.push(`  -H '${escapeSingleQuoted(key)}: ${escapeSingleQuoted(value)}'`);
  }
  if (entry.requestBody) {
    lines.push(`  --data-raw '${escapeSingleQuoted(entry.requestBody)}'`);
  }
  return lines.join(' \\\n');
}
