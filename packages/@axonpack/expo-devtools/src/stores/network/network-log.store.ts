import { EventEmitter } from 'expo';

import type { ResolvedNetworkConditions } from './network-conditions.store';

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

  source?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;

  mimeType?: string;

  size?: number;

  conditions?: ResolvedNetworkConditions;
};

type NetworkLogEvents = {
  change: () => void;
};

const MAX_ENTRIES = 200;

let entries: NetworkLogEntry[] = [];
let paused = false;
let preserveLog = true;

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
  setEnabled(nextEnabled: boolean) {
    enabled = nextEnabled;
    emitter.emit('change');
  },
  setPaused(nextPaused: boolean) {
    paused = nextPaused;
    emitter.emit('change');
  },
  setPreserveLog(nextPreserveLog: boolean) {
    preserveLog = nextPreserveLog;
    emitter.emit('change');
  },
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
