export type SandboxTab = 'request' | 'response';

export type KeyValueRow = { id: string; key: string; value: string; enabled: boolean };

let rowCounter = 0;

export function newRow(key = '', value = '', enabled = true): KeyValueRow {
  rowCounter += 1;
  return { id: `row-${rowCounter}`, key, value, enabled };
}

/** Keeps exactly one trailing blank row so the table always has a place to start typing a new one. */
export function ensureTrailingBlankRow(rows: KeyValueRow[]): KeyValueRow[] {
  const last = rows[rows.length - 1];
  if (!last || last.key !== '' || last.value !== '') return [...rows, newRow()];
  return rows;
}

export function rowsFromRecord(record: Record<string, string> | undefined): KeyValueRow[] {
  return ensureTrailingBlankRow(
    Object.entries(record ?? {}).map(([key, value]) => newRow(key, value))
  );
}

/** Splits a `Cookie` header (any casing) out of a header set so it can seed its own table
 * instead of duplicating into the Headers table too. */
export function extractCookieHeader(headers: Record<string, string> | undefined): {
  cookieValue: string | undefined;
  rest: Record<string, string>;
} {
  const rest: Record<string, string> = {};
  let cookieValue: string | undefined;
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (key.toLowerCase() === 'cookie') cookieValue = value;
    else rest[key] = value;
  }
  return { cookieValue, rest };
}

export function rowsToRecord(rows: KeyValueRow[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const row of rows) {
    if (row.enabled && row.key.trim()) record[row.key] = row.value;
  }
  return record;
}

/** Splits a URL's query string into rows and returns the bare base URL, so the URL bar and the
 * Query Parameters table don't fight over the same text — parsed once when the sandbox opens. */
export function splitUrl(url: string): { base: string; params: KeyValueRow[] } {
  const queryIndex = url.indexOf('?');
  if (queryIndex === -1) return { base: url, params: ensureTrailingBlankRow([]) };
  const base = url.slice(0, queryIndex);
  const params: KeyValueRow[] = [];
  new URLSearchParams(url.slice(queryIndex + 1)).forEach((value, key) => {
    params.push(newRow(key, value));
  });
  return { base, params: ensureTrailingBlankRow(params) };
}

export function buildFinalUrl(base: string, params: KeyValueRow[]): string {
  const enabled = params.filter((row) => row.enabled && row.key.trim());
  if (enabled.length === 0) return base;
  const search = new URLSearchParams();
  for (const row of enabled) search.append(row.key, row.value);
  return `${base}${base.includes('?') ? '&' : '?'}${search.toString()}`;
}

/** Cookies aren't readable from native fetch's jar (see ROADMAP.md's hard limits), so this table
 * is a user-editable convenience — its rows get serialized into a `Cookie` header at send time. */
export function parseCookieHeader(cookieHeader: string | undefined): KeyValueRow[] {
  const rows = (cookieHeader ?? '')
    .split(';')
    .map((pair) => {
      const separatorIndex = pair.indexOf('=');
      if (separatorIndex < 0) return null;
      const key = pair.slice(0, separatorIndex).trim();
      const value = pair.slice(separatorIndex + 1).trim();
      return key ? newRow(key, value) : null;
    })
    .filter((row): row is KeyValueRow => row !== null);
  return ensureTrailingBlankRow(rows);
}

export function rowsToCookieHeader(rows: KeyValueRow[]): string | undefined {
  const enabled = rows.filter((row) => row.enabled && row.key.trim());
  if (enabled.length === 0) return undefined;
  return enabled.map((row) => `${row.key}=${row.value}`).join('; ');
}

export type SandboxResult =
  | {
      ok: true;
      status: number;
      statusText: string;
      headers: Record<string, string>;
      body: string;
      duration: number;
    }
  | { ok: false; error: string; duration: number };

/** Sends via the global fetch — same one @bruin/devtools may have already patched, so a sandbox
 * request shows up as new activity in the log, same as a real replay would in any devtool. */
export async function sendSandboxRequest({
  method,
  url,
  headers,
  body,
}: {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | undefined;
}): Promise<SandboxResult> {
  const startedAt = Date.now();
  const allowsBody = method !== 'GET' && method !== 'HEAD';
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: allowsBody && body ? body : undefined,
    });
    const text = await response.text();
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    return {
      ok: true,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: text,
      duration: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startedAt,
    };
  }
}
