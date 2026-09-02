import { EventEmitter } from 'expo';

import type { StackFrame } from '../../../core/utils/parse-stack.util';
import type { CrashKind } from '../../crash/stores/crash.store';
import type { ConsoleArg } from '../utils/format-console-args.util';

/**
 * A console row's severity. The first five mirror the `console` method that produced the row;
 * `'input'` and `'result'` are the `>` prompt's own echo of what you typed and what came back.
 */
export type ConsoleLogLevel =
  | 'log'
  | 'info'
  | 'warn'
  | 'error'
  | 'debug'
  | 'input'
  | 'result'
  /** A crash, written by the crash capture rather than by anything the app called. */
  | 'crash';

/**
 * One row in the Console tab. Read them with `devtools.consoleLogStore.getSnapshot()`; the store
 * keeps the most recent 500, newest first.
 */
export type ConsoleLogEntry = {
  /** Unique id for this row, stable for as long as it is in the buffer. */
  id: string;
  /** Which `console` method produced it, or the prompt's own input/result. */
  level: ConsoleLogLevel;
  /**
   * The arguments as they were logged, kept apart so the UI can render an object as a tree and a
   * string as text. Use `text` if you only want a line to print.
   */
  parts: ConsoleArg[];
  /** The whole row flattened to one string — what search matches and what Copy copies. */
  text: string;
  /** When it was logged, as `Date.now()` milliseconds. */
  timestamp: number;
  /**
   * How many identical rows this one stands for. Consecutive duplicates collapse into a single row
   * with a count, the way a browser console does. `1` unless that happened.
   */
  count: number;
  /**
   * Where the row came from: `'native'` for the app's own console, or the `webviewSources` name of
   * the page that logged it.
   */
  source?: string;
  /** Set when this row is the console's echo of an error that also became a crash report. */
  crashId?: string;
  /**
   * Which kind of crash, so the row can carry the same icon the Crash tab gives it. A level has one
   * icon and a crash has five, and a native exception wearing the fatal-JS one would be a row that
   * misreports what happened.
   */
  crashKind?: CrashKind;
  /** How many breadcrumbs the report has, so the row can say so the way the Crash tab's row does. */
  crashBreadcrumbs?: number;
  /**
   * The error's name and message apart, because the crash card lays them out on separate lines the
   * way the Crash tab does. Carried rather than split back out of `text`, and rather than read from
   * the crash store — that buffer is far shorter than this one, so a row outlives its record.
   */
  crashName?: string;
  /** The crash's message, laid out under `crashName` on the row. */
  crashMessage?: string;
  /** Written by a run that already ended, and read back at this one's startup. */
  crashFromPreviousLaunch?: boolean;
  /**
   * The stack as the engine wrote it, when this row is one worth knowing the origin of. Raw, because
   * turning it into a file name is a request to the development server and most rows are never read.
   */
  callSite?: StackFrame[];
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
