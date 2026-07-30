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
};

type NetworkLogEvents = {
  change: () => void;
};

const MAX_ENTRIES = 200;

let entries: NetworkLogEntry[] = [];
const emitter = new EventEmitter<NetworkLogEvents>();

export const networkLogStore = {
  getSnapshot(): NetworkLogEntry[] {
    return entries;
  },
  subscribe(listener: () => void) {
    const subscription = emitter.addListener('change', listener);
    return () => subscription.remove();
  },
  add(entry: NetworkLogEntry) {
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
