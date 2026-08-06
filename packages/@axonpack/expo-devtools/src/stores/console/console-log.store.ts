import { EventEmitter } from 'expo';

export type ConsoleLogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export type ConsoleLogEntry = {
  id: string;
  level: ConsoleLogLevel;
  /** Every argument of the call, serialized and joined — what the row renders. */
  text: string;
  timestamp: number;
  /** How many times in a row this exact message was logged (see `add`). */
  count: number;
  /** Stack of the first `Error` argument, when one was passed. */
  stack?: string;
};

type ConsoleLogEvents = {
  change: () => void;
};

// Higher than the network log's cap — a render loop or a chatty library produces console output an
// order of magnitude faster than it produces requests, and 200 entries would scroll away in seconds.
const MAX_ENTRIES = 500;

let entries: ConsoleLogEntry[] = [];
let paused = false;
// Off until `createDevtoolsClient(...).init()` runs, for the same fail-safe reason as the network
// store: an app that never calls `init()` captures nothing, in production or anywhere else.
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
  /** Set by `createDevtoolsClient(...).init()`. Nothing records until this is true. */
  setEnabled(nextEnabled: boolean) {
    enabled = nextEnabled;
    emitter.emit('change');
  },
  setPaused(nextPaused: boolean) {
    paused = nextPaused;
    emitter.emit('change');
  },
  /**
   * Consecutive identical messages collapse into the existing row with a bumped `count` instead of
   * stacking up, the way a browser console does — one log inside a render or an interval otherwise
   * evicts everything else in the buffer within seconds.
   */
  add(entry: ConsoleLogEntry) {
    if (!enabled || paused) return;

    const newest = entries[0];
    if (newest && newest.level === entry.level && newest.text === entry.text) {
      entries = [
        { ...newest, count: newest.count + 1, timestamp: entry.timestamp },
        ...entries.slice(1),
      ];
    } else {
      entries = [entry, ...entries].slice(0, MAX_ENTRIES);
    }
    emitter.emit('change');
  },
  clear() {
    entries = [];
    emitter.emit('change');
  },
};
