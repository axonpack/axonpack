import type { NetworkEntry, NetworkLogEntry } from '../stores/network-log.store';

export const REDACTED = '[redacted]';

let redactedHeaders = new Set<string>();
// The agent CLI's floor: these never leave the app over the inspector socket, whatever the config.
const AGENT_MASKED_HEADERS = new Set(['authorization', 'cookie', 'set-cookie']);
let redactHook: ((entry: NetworkEntry) => NetworkEntry | null) | undefined;

export function configureNetworkRedaction(options: {
  headers?: readonly string[];
  redact?: (entry: NetworkEntry) => NetworkEntry | null;
}) {
  redactedHeaders = new Set((options.headers ?? []).map((name) => name.toLowerCase()));
  redactHook = options.redact;
}

function redactHeaders(headers: Record<string, string> | undefined, names: Set<string>) {
  if (!headers || names.size === 0) return headers;
  let result: Record<string, string> | undefined;
  for (const key of Object.keys(headers)) {
    if (!names.has(key.toLowerCase())) continue;
    result ??= { ...headers };
    result[key] = REDACTED;
  }
  return result ?? headers;
}

function redactHttpHeaders(entry: NetworkLogEntry, names: Set<string>): NetworkLogEntry {
  const requestHeaders = redactHeaders(entry.requestHeaders, names);
  const responseHeaders = redactHeaders(entry.responseHeaders, names);
  // A page's `document.cookie` is the same secret as the cookie header, just read another way.
  const pageCookies = entry.pageCookies && names.has('cookie') ? REDACTED : entry.pageCookies;
  return requestHeaders === entry.requestHeaders &&
    responseHeaders === entry.responseHeaders &&
    pageCookies === entry.pageCookies
    ? entry
    : { ...entry, requestHeaders, responseHeaders, pageCookies };
}

/**
 * Runs before an entry is stored, so the list, the detail panel, copy, export, the DevTools tab and
 * crash breadcrumbs only ever see what comes out of here. `null` means do not keep it at all.
 * Socket frames and stream events are not passed through: they are per message, and the hook runs
 * on rows.
 */
export function redactNetworkEntry<T extends NetworkEntry>(entry: T): T | null {
  const redacted = entry.kind === 'http' ? (redactHttpHeaders(entry, redactedHeaders) as T) : entry;
  if (!redactHook) return redacted;
  try {
    return redactHook(redacted) as T | null;
  } catch {
    // Fail closed. Keeping the entry after the app's own redaction broke could store the very value
    // it was written to remove.
    return null;
  }
}

/**
 * What the agent CLI reads a network row through, on top of whatever the app's own config already
 * redacted on write. The network topic maps its rows through it, so every filter runs on the masked
 * row and `--grep` or `--where` cannot probe a masked value either.
 */
export function maskNetworkEntryForAgent<T extends NetworkEntry>(entry: T): T {
  return entry.kind === 'http' ? (redactHttpHeaders(entry, AGENT_MASKED_HEADERS) as T) : entry;
}
