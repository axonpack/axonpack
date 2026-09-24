import type { NetworkLogEntry } from '../stores/network-log.store';

export const REDACTED = '[redacted]';

let redactedHeaders = new Set<string>();
let redactHook: ((entry: NetworkLogEntry) => NetworkLogEntry | null) | undefined;

export function configureNetworkRedaction(options: {
  headers?: readonly string[];
  redact?: (entry: NetworkLogEntry) => NetworkLogEntry | null;
}) {
  redactedHeaders = new Set((options.headers ?? []).map((name) => name.toLowerCase()));
  redactHook = options.redact;
}

function redactHeaders(headers: Record<string, string> | undefined) {
  if (!headers || redactedHeaders.size === 0) return headers;
  let result: Record<string, string> | undefined;
  for (const key of Object.keys(headers)) {
    if (!redactedHeaders.has(key.toLowerCase())) continue;
    result ??= { ...headers };
    result[key] = REDACTED;
  }
  return result ?? headers;
}

/**
 * Runs before an entry is stored, so the list, the detail panel, copy, export, the DevTools tab and
 * crash breadcrumbs only ever see what comes out of here. `null` means do not keep it at all.
 */
export function redactNetworkEntry(entry: NetworkLogEntry): NetworkLogEntry | null {
  const requestHeaders = redactHeaders(entry.requestHeaders);
  const responseHeaders = redactHeaders(entry.responseHeaders);
  // A page's `document.cookie` is the same secret as the cookie header, just read another way.
  const pageCookies =
    entry.pageCookies && redactedHeaders.has('cookie') ? REDACTED : entry.pageCookies;
  const redacted =
    requestHeaders === entry.requestHeaders &&
    responseHeaders === entry.responseHeaders &&
    pageCookies === entry.pageCookies
      ? entry
      : { ...entry, requestHeaders, responseHeaders, pageCookies };
  if (!redactHook) return redacted;
  try {
    return redactHook(redacted);
  } catch {
    // Fail closed. Keeping the entry after the app's own redaction broke could store the very value
    // it was written to remove.
    return null;
  }
}
