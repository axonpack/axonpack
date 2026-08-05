type FetchSnippetSource = {
  method: string;
  url: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
};

function formatHeaders(headers: Record<string, string> | undefined): string {
  const entries = Object.entries(headers ?? {});
  if (entries.length === 0) return '{}';
  const lines = entries.map(
    ([key, value]) => `    ${JSON.stringify(key)}: ${JSON.stringify(value)}`
  );
  return `{\n${lines.join(',\n')}\n  }`;
}

function buildFetchSnippet(entry: FetchSnippetSource, browserOnlyFields: boolean): string {
  const options = [
    `  "headers": ${formatHeaders(entry.requestHeaders)}`,
    `  "body": ${entry.requestBody ? JSON.stringify(entry.requestBody) : 'null'}`,
    `  "method": "${entry.method}"`,
    ...(browserOnlyFields ? ['  "mode": "cors"', '  "credentials": "include"'] : []),
  ];
  return `fetch(${JSON.stringify(entry.url)}, {\n${options.join(',\n')}\n});`;
}

/** A copy-pasteable browser `fetch()` call — the "Copy as fetch" item, matching Chrome DevTools. */
export function buildFetchCommand(entry: FetchSnippetSource): string {
  return buildFetchSnippet(entry, true);
}

/** Same as `buildFetchCommand` but drops the browser-only `mode`/`credentials` fields, which have
 * no meaning outside a page context — the "Copy as fetch (Node.js)" item. */
export function buildNodeFetchCommand(entry: FetchSnippetSource): string {
  return buildFetchSnippet(entry, false);
}
