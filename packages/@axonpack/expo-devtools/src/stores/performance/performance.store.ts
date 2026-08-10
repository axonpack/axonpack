import { EventEmitter } from 'expo';

export type MemorySample = {
  timestamp: number;
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
};

export type LongTaskEntry = {
  id: string;
  /**
   * Wall clock, recorded on insert. `startTime` is an offset from the performance time origin, which
   * on a device that has been up for days reads as "464670 s" and tells a reader nothing.
   */
  timestamp: number;
  name: string;
  /** ms the JS thread was blocked. */
  duration: number;
  /** ms since the performance time origin. */
  startTime: number;
};

/**
 * All four fields come straight from `performance.rnStartupTiming` and any of them can be null — the
 * platform only fills them in if its native code calls `ReactMarker.setAppStartTime`.
 */
export type StartupTiming = {
  startTime?: number;
  endTime?: number;
  initializeRuntimeStart?: number;
  executeJavaScriptBundleEntryPointStart?: number;
};

export type InteractionEntry = {
  id: string;
  timestamp: number;
  /** The event type, e.g. `touchstart`, `click`. */
  name: string;
  startTime: number;
  /** Event to next paint — what the user actually waited. */
  duration: number;
  /** How long the handler itself held the JS thread, a subset of `duration`. */
  processingDuration: number;
};

/**
 * Whether each collector actually attached. Every one of these depends on what the native side
 * implements, which varies by platform and RN version — without this an empty list is ambiguous
 * between "nothing happened" and "this device never reports it", which are opposite conclusions.
 */
export type PerformanceSupport = {
  memory: boolean;
  longTasks: boolean;
  interactions: boolean;
};

export type PerformanceSnapshot = {
  memory: MemorySample[];
  longTasks: LongTaskEntry[];
  interactions: InteractionEntry[];
  startup?: StartupTiming;
  support: PerformanceSupport;
};

type PerformanceEvents = {
  change: () => void;
};

const DEFAULT_HISTORY_SIZE = 120;

let historySize = DEFAULT_HISTORY_SIZE;
let memory: MemorySample[] = [];
let longTasks: LongTaskEntry[] = [];
let interactions: InteractionEntry[] = [];
let startup: StartupTiming | undefined;
// Kept out of the snapshot on purpose: it changes twice a second, and anything reading the snapshot
// re-renders with it. `getFps` is a primitive selector so only the one leaf that wants it subscribes.
let fps: number | undefined;
let support: PerformanceSupport = {
  memory: false,
  longTasks: false,
  interactions: false,
};
let paused = false;
let enabled = false;

const emitter = new EventEmitter<PerformanceEvents>();

let snapshot: PerformanceSnapshot = {
  memory,
  longTasks,
  interactions,
  startup,
  support,
};

/**
 * At most one notification per this interval. Without a ceiling the tab feeds itself: rendering the
 * list is work that can exceed the long-task threshold, which records another entry, which notifies,
 * which renders again. Recording our own render is indistinguishable from a real long task, so the
 * loop has to be broken by bounding the notification rate rather than by filtering entries.
 *
 * Leading edge fires immediately, so a single user action still lands at once; a burst coalesces into
 * one trailing notification.
 */
const MIN_NOTIFY_INTERVAL_MS = 250;
let lastNotifyAt = 0;
let pendingNotify: ReturnType<typeof setTimeout> | undefined;

function notify() {
  lastNotifyAt = Date.now();
  emitter.emit('change');
}

/**
 * `immediate` is for control changes — pausing, clearing, support flags. Those are rare, and a user
 * pressing record has to see it take effect at once; only the high-frequency data path is throttled.
 */
function publish(immediate = false) {
  snapshot = { memory, longTasks, interactions, startup, support };

  if (immediate) {
    if (pendingNotify !== undefined) {
      clearTimeout(pendingNotify);
      pendingNotify = undefined;
    }
    notify();
    return;
  }

  const sinceLast = Date.now() - lastNotifyAt;
  if (sinceLast >= MIN_NOTIFY_INTERVAL_MS) {
    if (pendingNotify !== undefined) {
      clearTimeout(pendingNotify);
      pendingNotify = undefined;
    }
    notify();
    return;
  }
  if (pendingNotify === undefined) {
    pendingNotify = setTimeout(() => {
      pendingNotify = undefined;
      notify();
    }, MIN_NOTIFY_INTERVAL_MS - sinceLast);
  }
}

let taskCounter = 0;
let interactionCounter = 0;

export const performanceStore = {
  getSnapshot(): PerformanceSnapshot {
    return snapshot;
  },
  subscribe(listener: () => void) {
    const subscription = emitter.addListener('change', listener);
    return () => subscription.remove();
  },
  isEnabled(): boolean {
    return enabled;
  },
  isPaused(): boolean {
    return paused;
  },
  getFps(): number | undefined {
    return fps;
  },
  /** Latest sample only — the leaf that renders the number doesn't need the whole series. */
  getLatestHeapUsed(): number | undefined {
    return memory.at(-1)?.usedJSHeapSize;
  },
  setEnabled(nextEnabled: boolean) {
    enabled = nextEnabled;
    publish(true);
  },
  setPaused(nextPaused: boolean) {
    paused = nextPaused;
    publish(true);
  },
  /** Reported by each collector as it installs, so the UI can say why a list is empty. */
  setSupport(next: Partial<PerformanceSupport>) {
    support = { ...support, ...next };
    publish(true);
  },
  setHistorySize(next: number) {
    historySize = Math.max(1, next);
  },
  addMemorySample(sample: MemorySample) {
    if (!enabled || paused) return;
    // Appended rather than prepended: the sparkline reads left-to-right as oldest-to-newest.
    memory = [...memory, sample].slice(-historySize);
    publish();
  },
  /**
   * Batched, not one call per entry: every collector receives entries in groups (an observer
   * callback, or the whole native buffer on attach), and publishing per entry meant a full re-render
   * of the list for each one.
   */
  addLongTasks(entries: Omit<LongTaskEntry, 'id' | 'timestamp'>[]) {
    if (!enabled || paused || entries.length === 0) return;
    const now = Date.now();
    const additions = entries.slice(-historySize).map((entry) => {
      taskCounter += 1;
      return { ...entry, id: `longtask-${taskCounter}`, timestamp: now };
    });
    longTasks = [...additions.reverse(), ...longTasks].slice(0, historySize);
    publish();
  },
  addInteractions(entries: Omit<InteractionEntry, 'id' | 'timestamp'>[]) {
    if (!enabled || paused || entries.length === 0) return;
    const now = Date.now();
    const additions = entries.slice(-historySize).map((entry) => {
      interactionCounter += 1;
      return { ...entry, id: `interaction-${interactionCounter}`, timestamp: now };
    });
    interactions = [...additions.reverse(), ...interactions].slice(0, historySize);
    publish();
  },
  /** Read once at startup, so it isn't gated on `paused` the way sampled data is. */
  setStartup(next: StartupTiming) {
    if (!enabled) return;
    startup = next;
    publish();
  },
  setFps(next: number | undefined) {
    if (!enabled || paused) return;
    fps = next;
    publish();
  },
  clear() {
    memory = [];
    longTasks = [];
    interactions = [];
    fps = undefined;
    publish(true);
  },
};
