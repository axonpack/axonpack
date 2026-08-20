import { EventEmitter } from 'expo';

/**
 * What produced the record. The distinction that matters is whether the process survived: a
 * `js-fatal` or `native-exception` is read back from disk on the *next* launch, everything else is
 * captured while the app is still running and can be shown immediately.
 */
export type CrashKind =
  'js-fatal' | 'js-error' | 'unhandled-rejection' | 'react-render' | 'native-exception';

export type CrashBreadcrumbCategory = 'console' | 'network';

export type CrashBreadcrumb = {
  at: number;
  category: CrashBreadcrumbCategory;
  /** Console level, or the request's status bucket — whatever the category's own severity is. */
  level?: string;
  message: string;
};

export type CrashDeviceInfo = {
  platform: string;
  osVersion?: string;
  model?: string;
  brand?: string;
  appVersion?: string;
  buildVersion?: string;
  bundleId?: string;
  isEmulator?: boolean;
  totalMemoryBytes?: number;
  availableMemoryBytes?: number;
  jsEngine?: string;
  reactNativeVersion?: string;
};

export type CrashNativeDetail = {
  /** The exception class — `NSInvalidArgumentException`, `java.lang.IllegalStateException`. */
  type?: string;
  thread?: string;
  frames?: string[];
};

export type CrashRecord = {
  id: string;
  kind: CrashKind;
  /** The error's constructor name, kept separate from the message so a row can lead with it. */
  name: string;
  message: string;
  stack: string | null;
  /** React's component stack — only a `react-render` record has one, and it's the useful half. */
  componentStack?: string | null;
  /**
   * The record was written to disk by a previous run of the app and read back at startup, which is
   * the only proof we have that the process actually died rather than carried on.
   */
  fromPreviousLaunch: boolean;
  timestamp: number;
  device?: CrashDeviceInfo;
  breadcrumbs?: CrashBreadcrumb[];
  context?: Record<string, unknown>;
  native?: CrashNativeDetail;
  /** Cleared once the report has been shown; drives both the popup and the tab badge. */
  seen: boolean;
};

type CrashEvents = {
  change: () => void;
};

const DEFAULT_MAX_RECORDS = 25;

let records: CrashRecord[] = [];
let maxRecords = DEFAULT_MAX_RECORDS;

/**
 * The same disabled-until-init gate every store here has — but this one is flipped by
 * `initCrashReporting()` rather than `init()`, because crash capture is the single subsystem meant
 * to be able to run in a release build. There is no `paused` flag: a crash is not a stream, and a
 * record you chose not to keep is a crash nobody ever hears about.
 */
let enabled = false;

const emitter = new EventEmitter<CrashEvents>();

export const crashStore = {
  getSnapshot(): CrashRecord[] {
    return records;
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
  setMaxRecords(next: number) {
    maxRecords = Math.max(1, next);
  },
  add(record: CrashRecord) {
    if (!enabled) return;
    records = [record, ...records].slice(0, maxRecords);
    emitter.emit('change');
  },
  markSeen(id: string) {
    records = records.map((record) => (record.id === id ? { ...record, seen: true } : record));
    emitter.emit('change');
  },
  markAllSeen() {
    records = records.map((record) => (record.seen ? record : { ...record, seen: true }));
    emitter.emit('change');
  },
  clear() {
    records = [];
    emitter.emit('change');
  },
  /** Test-only reset; nothing in the UI turns capture back off. */
  reset() {
    enabled = false;
    maxRecords = DEFAULT_MAX_RECORDS;
    records = [];
    emitter.emit('change');
  },
};
