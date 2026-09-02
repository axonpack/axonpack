import { EventEmitter } from 'expo';

/**
 * What produced the record. The distinction that matters is whether the process survived. A
 * `native-exception` is read back from disk on the *next* launch — and so is the crash a `js-fatal`
 * becomes, since React Native reports that one to the native side on its way out. Every other kind
 * is captured while the app is still running and can be shown immediately.
 */
export type CrashKind =
  'js-fatal' | 'js-error' | 'unhandled-rejection' | 'react-render' | 'native-exception';

/** Which log a breadcrumb came from — the Console tab or the Network tab. */
export type CrashBreadcrumbCategory = 'console' | 'network';

/**
 * One thing the app did shortly before it broke, read from the Console and Network logs at crash
 * time. Present on a record only when `crash.breadcrumbs` is on (it is by default).
 */
export type CrashBreadcrumb = {
  /** When it happened, as `Date.now()` milliseconds. */
  at: number;
  /** Which log it came from. */
  category: CrashBreadcrumbCategory;
  /** Console level, or the request's status bucket — whatever the category's own severity is. */
  level?: string;
  /** The console text, or `METHOD url → status` for a request. */
  message: string;
};

/**
 * The device and build a crash happened on, filled in by the native module. Every field but
 * `platform` is optional: what is available differs by platform, and none of it is worth failing a
 * report over.
 */
export type CrashDeviceInfo = {
  /** `'ios'`, `'android'` or `'web'`. */
  platform: string;
  /** OS version string, e.g. `'17.4'`. */
  osVersion?: string;
  /** Device model, e.g. `'iPhone15,2'`. */
  model?: string;
  /** Manufacturer, e.g. `'Apple'`, `'samsung'`. */
  brand?: string;
  /** Your app's marketing version — `CFBundleShortVersionString` / `versionName`. */
  appVersion?: string;
  /** Your app's build number — `CFBundleVersion` / `versionCode`. */
  buildVersion?: string;
  /** Bundle identifier / Android application id. */
  bundleId?: string;
  /** `true` on a simulator or emulator. Useful for filtering your own noise out of reports. */
  isEmulator?: boolean;
  /** Physical RAM in bytes. */
  totalMemoryBytes?: number;
  /** Free RAM in bytes at the moment of the crash — the number that matters for an OOM. */
  availableMemoryBytes?: number;
  /** JS engine name, e.g. `'Hermes'`. */
  jsEngine?: string;
  /** React Native version the app was built against. */
  reactNativeVersion?: string;
};

/** The native side of a `'native-exception'` record. Absent on every other kind. */
export type CrashNativeDetail = {
  /** The exception class — `NSInvalidArgumentException`, `java.lang.IllegalStateException`. */
  type?: string;
  /** The thread it was thrown on, when the platform reports one. */
  thread?: string;
  /** The native stack, one frame per entry, innermost first. */
  frames?: string[];
};

/**
 * One captured crash. This is what the Crash tab lists, what `crash.redact` is handed, and what
 * arrives in `crash.onCrash` — the shape to map onto your own reporter's payload.
 */
export type CrashRecord = {
  /** Unique id for this record, stable for as long as it is in memory. */
  id: string;
  /** What produced it, and whether the app survived it. */
  kind: CrashKind;
  /** The error's constructor name, kept separate from the message so a row can lead with it. */
  name: string;
  /** The error message. */
  message: string;
  /** The JS stack as the engine gave it, or `null` when there was none. */
  stack: string | null;
  /** React's component stack — only a `react-render` record has one, and it's the useful half. */
  componentStack?: string | null;
  /**
   * The record was written to disk by a previous run of the app and read back at startup, which is
   * the only proof we have that the process actually died rather than carried on.
   */
  fromPreviousLaunch: boolean;
  /** When the crash was captured, as `Date.now()` milliseconds. */
  timestamp: number;
  /** Device and build details from the native module; absent without it (Expo Go, web). */
  device?: CrashDeviceInfo;
  /** Recent console and network activity. Absent when `crash.breadcrumbs` is off. */
  breadcrumbs?: CrashBreadcrumb[];
  /** Whatever the app last passed to `devtools.setCrashContext`. Absent until you set some. */
  context?: Record<string, unknown>;
  /** Native exception details. Present on a `'native-exception'` record only. */
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
