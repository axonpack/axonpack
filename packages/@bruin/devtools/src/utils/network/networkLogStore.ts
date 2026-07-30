import { EventEmitter } from 'expo';

export type NetworkLogStatus = 'pending' | 'success' | 'error';

export type NetworkLogEntry = {
  id: string;
  method: string;
  url: string;
  status: NetworkLogStatus;
  statusCode?: number;
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
  subscribe(listener: () => void) {
    const subscription = emitter.addListener('change', listener);
    return () => subscription.remove();
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
    if (paused) return;
    entries = [entry, ...entries].slice(0, MAX_ENTRIES);
    emitter.emit('change');
  },
  update(id: string, patch: Partial<NetworkLogEntry>) {
    entries = entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry));
    emitter.emit('change');
  },
  clear() {
    entries = [];
    emitter.emit('change');
  },
};
