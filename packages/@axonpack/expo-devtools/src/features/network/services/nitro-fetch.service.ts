import { NETWORK_SOURCES } from '../constants/sources.const';
import { networkLogStore } from '../stores/network-log.store';

/**
 * `react-native-nitro-fetch` is a JSI HTTP client, which means it answers no patch in this package: it
 * never touches `globalThis.fetch`, `XMLHttpRequest`, or React Native's own networking. It is the one
 * traffic path here that cannot be intercepted at all.
 *
 * It does not need to be. The library publishes an observer of its own — `NetworkInspector`, with
 * `enable`, `getEntries` and an `onEntry` that returns its own unsubscribe — so this reads what the
 * client already records rather than standing in front of it. Nothing is wrapped, delayed or altered,
 * which also means the throttle and offline switches do not reach this traffic and the rows say so by
 * carrying no conditions.
 *
 * The module is reached through a require the bundler cannot resolve statically, the same way Expo's
 * fetch module is: an app without the library gets a runtime miss instead of a failed build.
 */
const NITRO_MODULE = 'react-native-nitro-fetch';

declare const require: (id: string) => unknown;

type NitroHeader = { key: string; value: string };

/** A frame of one of that client's sockets, which React Native's own socket patch cannot see either. */
type NitroSocketMessage = {
  direction: 'sent' | 'received';
  data: string;
  size: number;
  isBinary: boolean;
  timestamp: number;
};

type NitroSocketEntry = {
  id: string;
  type: 'websocket';
  url: string;
  protocols?: string[];
  startTime: number;
  duration?: number;
  readyState?: string;
  messages?: NitroSocketMessage[];
  closeCode?: number;
  closeReason?: string;
  error?: string;
};

type NitroRequestEntry = {
  id: string;
  type: 'http';
  url: string;
  method: string;
  requestHeaders?: NitroHeader[];
  requestBody?: string;
  status?: number;
  statusText?: string;
  responseHeaders?: NitroHeader[];
  responseBody?: string;
  responseBodySize?: number;
  startTime: number;
  endTime?: number;
  duration?: number;
  error?: string;
};

type NitroEntry = NitroRequestEntry | NitroSocketEntry;

type NitroModule = {
  NetworkInspector: {
    enable: () => void;
    isEnabled: () => boolean;
    onEntry: (listener: (entry: NitroEntry) => void) => () => void;
    getEntries: () => readonly NitroEntry[];
  };
};

let unsubscribe: (() => void) | null = null;

/**
 * One observer reports both kinds this client carries, so which of them is wanted is decided here
 * rather than by whether the observer is attached: requests and sockets are separate switches for the
 * consumer, and a single subscription cannot honour half of one.
 */
let capturing = { http: true, websocket: true };

/**
 * That library stamps its entries with `performance.now()` — milliseconds since the process started,
 * not since the epoch. Every row here is stamped in epoch milliseconds, so the two have to be lined
 * up: without this a nitro row claimed to have started in 1970, which sorted it to the bottom of the
 * list for ever and stretched the overview strip's range back fifty-six years.
 *
 * `timeOrigin` is the epoch instant that clock counts from, and the subtraction is the fallback where
 * a runtime does not publish it.
 */
function timestampOrigin(): number {
  if (typeof performance === 'undefined') return 0;
  if (typeof performance.timeOrigin === 'number') return performance.timeOrigin;
  return Date.now() - performance.now();
}

function toEpochMs(timestamp: number): number {
  const origin = timestampOrigin();
  // A runtime with no `performance` at all leaves the stamp unusable, so the row takes the time it was
  // read instead of a number fifty-six years out.
  return origin === 0 ? Date.now() : Math.round(origin + timestamp);
}

function loadNitro(): NitroModule | null {
  try {
    const module = require(NITRO_MODULE) as NitroModule | undefined;
    return module?.NetworkInspector === undefined ? null : module;
  } catch {
    return null;
  }
}

function headersToRecord(headers: NitroHeader[] | undefined): Record<string, string> | undefined {
  if (!headers?.length) return undefined;
  const result: Record<string, string> = {};
  for (const header of headers) result[header.key.toLowerCase()] = header.value;
  return result;
}

/**
 * One entry, applied whole. The observer reports a request when it finishes rather than when it
 * starts, so there is no pending row to update — which is why a nitro row appears complete and never
 * shows progress.
 */
export function applyNitroEntry(entry: NitroEntry) {
  if (entry.type === 'websocket') {
    if (capturing.websocket) applyNitroSocket(entry);
    return;
  }
  if (!capturing.http) return;
  // Checked rather than trusted: the entry comes from an untyped require, so a kind this version of
  // the library reports and this one does not know is skipped instead of half-recorded.
  if (entry.type !== 'http') return;

  const failed = entry.error !== undefined || entry.status === undefined || entry.status === 0;

  const id = `nitro-${entry.id}`;
  // A replay can meet an entry the observer has already reported, and `add` does not dedupe — so a
  // row that is already here is patched rather than posted again.
  if (networkLogStore.getSnapshot().some((row) => row.id === id)) {
    networkLogStore.update(id, {
      status: failed ? 'error' : 'success',
      statusCode: entry.status === 0 ? undefined : entry.status,
      statusText: entry.statusText,
      responseBody: entry.responseBody,
      responseHeaders: headersToRecord(entry.responseHeaders),
      error: entry.error,
      duration: entry.duration,
    });
    return;
  }

  networkLogStore.add({
    id,
    method: entry.method.toUpperCase(),
    url: entry.url,
    status: failed ? 'error' : 'success',
    statusCode: entry.status === 0 ? undefined : entry.status,
    statusText: entry.statusText,
    requestBody: entry.requestBody,
    requestHeaders: headersToRecord(entry.requestHeaders),
    responseBody: entry.responseBody,
    responseHeaders: headersToRecord(entry.responseHeaders),
    mimeType: headersToRecord(entry.responseHeaders)?.['content-type']?.split(';')[0]?.trim(),
    size: entry.responseBodySize,
    error: entry.error,
    duration:
      entry.duration ?? (entry.endTime === undefined ? undefined : entry.endTime - entry.startTime),
    startedAt: toEpochMs(entry.startTime),
    source: NETWORK_SOURCES.nitro,
  });
}

/**
 * That client's sockets, which are as invisible to the rest of this package as its requests: they never
 * reach React Native's `WebSocketModule`, so the native socket patch cannot see them. The observer
 * reports a socket whole, with the frames it has carried, so the row and its messages are written
 * together rather than accumulated as they arrive.
 *
 * `readyState` is a string from that library rather than a number, and only the states our own rows
 * have are mapped — anything else is reported as open, which is what a socket with frames on it is.
 */
function applyNitroSocket(entry: NitroSocketEntry) {
  const id = `nitro-${entry.id}`;
  // Uppercase, because that is what the library uses — `CONNECTING`, `OPEN`, `CLOSED`. Compared
  // case-insensitively rather than against one spelling, since a comparison that can never match is
  // worse than none: it reads as handled.
  const state = entry.readyState?.toLowerCase();
  const closed = entry.closeCode !== undefined || state === 'closed';

  const status = entry.error !== undefined ? 'error' : closed ? 'closed' : 'open';
  const known = networkLogStore.getWebSocketSnapshot().some((socket) => socket.id === id);

  // **The same entry object arrives again on every notification** — the library reports a socket at
  // open, at connect, on each frame, at close and on error, always handing over the whole entry. Added
  // blindly, a socket carrying twenty frames became twenty-three rows and two hundred repeated
  // messages, which is enough to evict every real request from the log.
  if (known) {
    networkLogStore.updateWebSocket(id, {
      status,
      duration: entry.duration,
      closeCode: entry.closeCode,
      closeReason: entry.closeReason,
      error: entry.error,
    });
  } else {
    networkLogStore.addWebSocket({
      id,
      // The library's id is a string; ours is React Native's numeric handle, which this traffic has
      // none of. Zero stands for "not one of the platform's own".
      socketId: 0,
      url: entry.url,
      method: 'WS',
      source: NETWORK_SOURCES.nitro,
      protocols: entry.protocols?.length ? entry.protocols : undefined,
      status,
      startedAt: toEpochMs(entry.startTime),
      duration: entry.duration,
      closeCode: entry.closeCode,
      closeReason: entry.closeReason,
      error: entry.error,
    });
  }

  // The frames arrive as the whole history each time, so only the ones past what is already recorded
  // are appended. Their index in that history is their identity, which is what makes this repeatable.
  const alreadyRecorded = networkLogStore.getWebSocketMessages(id).length;
  const frames = entry.messages ?? [];

  for (let index = alreadyRecorded; index < frames.length; index += 1) {
    const message = frames[index];
    networkLogStore.addWebSocketMessage(id, {
      id: `${id}-${index}`,
      direction: message.direction,
      // A binary frame is relayed as a description of its bytes, the same as on every other path.
      data: message.isBinary ? `[binary ${message.size} bytes]` : message.data,
      messageType: message.isBinary ? 'binary' : 'text',
      timestamp: toEpochMs(message.timestamp),
    });
  }
}

/** Whether the library is installed at all, which is what the panel reports rather than assuming. */
export function isNitroFetchAvailable(): boolean {
  return loadNitro() !== null;
}

/**
 * Replayed on demand as well as at install, because the store drops everything while recording is
 * paused — and `network.disabledByDefault` starts it that way. An observer attached during a pause
 * used to deliver nothing that survived, and nothing re-read the library's buffer when the record
 * button went on: the same trap the performance collectors document, where the fix is to re-attach
 * rather than to filter on write.
 */
export function replayNitroEntries() {
  const module = loadNitro();
  if (!module) return;

  try {
    for (const entry of module.NetworkInspector.getEntries()) {
      // Still in flight: the library pushes an entry when a request starts and only notifies when it
      // ends, so replaying one now would post a row claiming status 0 — a failure that never happened.
      if (entry.type === 'http' && entry.endTime === 0) continue;
      applyNitroEntry(entry);
    }
  } catch {
    // A library whose observer differs is a missing tier, not a failure.
  }
}

export function observeNitroFetch(kinds: { http: boolean; websocket: boolean }) {
  capturing = kinds;
  if (!kinds.http && !kinds.websocket) return;
  if (unsubscribe !== null) return;

  const module = loadNitro();
  if (!module) return;

  const inspector = module.NetworkInspector;
  try {
    if (!inspector.isEnabled()) inspector.enable();
    // Whatever it recorded before this ran, which for a JSI client can include startup traffic no
    // patch here would ever have seen.
    replayNitroEntries();
    unsubscribe = inspector.onEntry(applyNitroEntry);
  } catch {
    // A version of the library with a different observer is a missing tier, not a failure.
    unsubscribe = null;
  }
}

/** Test-only, and the reason the unsubscribe the library hands back is kept. */
export function stopObservingNitroFetch() {
  unsubscribe?.();
  unsubscribe = null;
  capturing = { http: true, websocket: true };
}
