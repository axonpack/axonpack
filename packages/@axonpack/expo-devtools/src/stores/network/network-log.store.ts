import { EventEmitter } from 'expo';

export type NetworkLogStatus = 'pending' | 'success' | 'error';

export type NetworkLogEntry = {
  id: string;
  method: string;
  url: string;
  status: NetworkLogStatus;
  statusCode?: number;
  statusText?: string;
  requestBody?: string;
  responseBody?: string;
  error?: string;
  startedAt: number;
  duration?: number;
  /** Where this request came from — 'fetch', 'xhr', or a WebView name. */
  source?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  /** Derived from the response's content-type header (charset stripped). */
  mimeType?: string;
  /** Best-effort byte size — prefers the Content-Length header, falls back to the response body's length. */
  size?: number;
};

type NetworkLogEvents = {
  change: () => void;
};

const MAX_ENTRIES = 200;

let entries: NetworkLogEntry[] = [];
let paused = false;
let preserveLog = true;
// Off until `createDevtoolsClient(...).init()` actually runs — so forgetting to call `init()`
// (e.g. a build that skips it in production) fails safe: no capture happens anywhere, including
// WebView instrumentation, which isn't otherwise gated by anything else in this file.
let enabled = false;
const emitter = new EventEmitter<NetworkLogEvents>();

export const networkLogStore = {
  getSnapshot(): NetworkLogEntry[] {
    return entries;
  },
  isPaused(): boolean {
    return paused;
  },
  isPreserveLogEnabled(): boolean {
    return preserveLog;
  },
  isEnabled(): boolean {
    return enabled;
  },
  subscribe(listener: () => void) {
    const subscription = emitter.addListener('change', listener);
    return () => subscription.remove();
  },
  /** Set by `createDevtoolsClient(...).init()`. Nothing records until this is true. */
  setEnabled(nextEnabled: boolean) {
    enabled = nextEnabled;
    emitter.emit('change');
  },
  /** Stops new requests from being recorded. Requests already in-flight still get their final result filled in via `update`. */
  setPaused(nextPaused: boolean) {
    paused = nextPaused;
    emitter.emit('change');
  },
  /** When false, a WebView navigation (fresh page load) clears the log automatically. */
  setPreserveLog(nextPreserveLog: boolean) {
    preserveLog = nextPreserveLog;
    emitter.emit('change');
  },
  /** Called when a monitored WebView loads a fresh page. Clears the log unless `preserveLog` is enabled. */
  notifyNavigation() {
    if (!preserveLog) {
      entries = [];
      emitter.emit('change');
    }
  },
  add(entry: NetworkLogEntry) {
    if (!enabled || paused) return;
    entries = [entry, ...entries].slice(0, MAX_ENTRIES);
    emitter.emit('change');
  },
  update(id: string, patch: Partial<NetworkLogEntry>) {
    if (!enabled) return;
    entries = entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry));
    emitter.emit('change');
  },
  clear() {
    entries = [];
    emitter.emit('change');
  },
};
