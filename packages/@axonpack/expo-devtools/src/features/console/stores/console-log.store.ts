import { EventEmitter } from 'expo';

import type { ConsoleArg } from '../utils/format-console-args.util';

export type ConsoleLogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug' | 'input' | 'result';

export type ConsoleLogEntry = {
  id: string;
  level: ConsoleLogLevel;

  parts: ConsoleArg[];

  text: string;
  timestamp: number;

  count: number;

  source?: string;
  /** Set when this row is the console's echo of an error that also became a crash report. */
  crashId?: string;
};

type ConsoleLogEvents = {
  change: () => void;
};

const MAX_ENTRIES = 500;

let entries: ConsoleLogEntry[] = [];
let paused = false;

let enabled = false;
const emitter = new EventEmitter<ConsoleLogEvents>();

export const consoleLogStore = {
  getSnapshot(): ConsoleLogEntry[] {
    return entries;
  },
  isPaused(): boolean {
    return paused;
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
  add(entry: ConsoleLogEntry, options?: { force?: boolean }) {
    if (!enabled) return;

    if (paused && !options?.force) return;

    const collapsible = entry.level !== 'input' && entry.level !== 'result';
    const newest = entries[0];

    if (
      collapsible &&
      newest &&
      newest.level === entry.level &&
      newest.text === entry.text &&
      newest.source === entry.source
    ) {
      entries = [
        // The row shows the newest occurrence's time, so it should open the newest occurrence's report.
        {
          ...newest,
          count: newest.count + 1,
          timestamp: entry.timestamp,
          crashId: entry.crashId ?? newest.crashId,
        },
        ...entries.slice(1),
      ];
    } else {
      entries = [entry, ...entries].slice(0, MAX_ENTRIES);
    }
    emitter.emit('change');
  },
  update(id: string, patch: Partial<ConsoleLogEntry>) {
    entries = entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry));
    emitter.emit('change');
  },
  clear() {
    entries = [];
    emitter.emit('change');
  },
};
