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
  /**
   * Platform-reported markers from `performance.rnStartupTiming`. Nullable individually, and absent
   * entirely unless native calls `ReactMarker.setAppStartTime` — which many setups never do.
   */
  startTime?: number;
  endTime?: number;
  initializeRuntimeStart?: number;
  executeJavaScriptBundleEntryPointStart?: number;
  /**
   * Measured by this package instead of reported by the platform, all epoch milliseconds so they are
   * directly comparable. Present whenever the native module is installed, which is what makes the
   * section useful on devices where the platform markers are all null.
   */
  processStart?: number;
  nativeModuleInit?: number;
  jsBundleEval?: number;
  initCalled?: number;
  firstRender?: number;
};

export type UserTimingEntry = {
  id: string;
  timestamp: number;
  /** Matches the spec's `entryType`: a mark is a point, a measure is a span. */
  kind: 'mark' | 'measure';
  name: string;
  /** Offset from the performance time origin, as the spec defines `startTime`. */
  startTime: number;
  /** Always 0 for a mark. A measure's duration may be negative — the spec allows it. */
  duration: number;
  /** The spec's arbitrary `detail` payload, rendered as text when present. */
  detail?: string;
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
 * Entries the platform discarded before we saw them. A `buffered` observer replays what the user agent
 * kept, and the spec hands the overflow count to the callback — without surfacing it, "6 long tasks"
 * silently means "6 of however many happened".
 */
/**
 * The app's real footprint and the device's RAM, from the native module. Distinct from `MemorySample`,
 * which is the JS heap — the two differ by a large factor and conflating them is the most common way to
 * misread a memory graph.
 */
export type SystemMemorySample = {
  timestamp: number;
  appBytes?: number;
  totalBytes?: number;
  /** Android reports system-wide free RAM; iOS reports what this process may still allocate. */
  availableToAppBytes?: number;
};

/** Android only: iOS disk-space APIs are required-reason, so they aren't read. */
export type StorageInfo = {
  totalBytes?: number;
  freeBytes?: number;
};

export type PerformanceDropped = {
  longTasks: number;
  interactions: number;
};

/**
 * Whether each collector actually attached. Each depends on what the native side implements, which
 * varies by platform and RN version — without this an empty list is ambiguous between "nothing
 * happened" and "this device never reports it", which are opposite conclusions.
 */
export type PerformanceSupport = {
  memory: boolean;
  /** The native module, which app memory and device RAM both need. */
  systemMemory: boolean;
  longTasks: boolean;
  interactions: boolean;
};

export type PerformanceSnapshot = {
  memory: MemorySample[];
  systemMemory: SystemMemorySample[];
  storage?: StorageInfo;
  longTasks: LongTaskEntry[];
  userTiming: UserTimingEntry[];
  interactions: InteractionEntry[];
  startup?: StartupTiming;
  support: PerformanceSupport;
  dropped: PerformanceDropped;
};

type PerformanceEvents = {
  change: () => void;
};

const DEFAULT_HISTORY_SIZE = 120;

let historySize = DEFAULT_HISTORY_SIZE;
let memory: MemorySample[] = [];
let systemMemory: SystemMemorySample[] = [];
let storage: StorageInfo | undefined;
let longTasks: LongTaskEntry[] = [];
let userTiming: UserTimingEntry[] = [];
let interactions: InteractionEntry[] = [];
let startup: StartupTiming | undefined;
// Kept out of the snapshot on purpose: it changes twice a second, and anything reading the snapshot
// re-renders with it. `getFps` is a primitive selector so only the one leaf that wants it subscribes.
let fps: number | undefined;
let uiFps: number | undefined;
// Five minutes at the monitor's 500ms window. Held here rather than in the snapshot for the same reason
// the scalars are: only the two frame-rate cards read it, and it changes twice a second.
const FPS_HISTORY_SIZE = 600;
let fpsHistory: number[] = [];
let uiFpsHistory: number[] = [];
// Monotonic within a session. The chart's scale is built from this rather than from the visible window, so
// it never shrinks: an axis that grows and shrinks with the buffer makes the line jitter and makes two
// moments incomparable. Reset only by the bin.
let fpsPeak = 0;
let support: PerformanceSupport = {
  memory: false,
  systemMemory: false,
  longTasks: false,
  interactions: false,
};
let dropped: PerformanceDropped = { longTasks: 0, interactions: 0 };
let paused = false;
let enabled = false;

const emitter = new EventEmitter<PerformanceEvents>();

let snapshot: PerformanceSnapshot = {
  memory,
  systemMemory,
  storage,
  longTasks,
  userTiming,
  interactions,
  startup,
  support,
  dropped,
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
  snapshot = {
    memory,
    systemMemory,
    storage,
    longTasks,
    userTiming,
    interactions,
    startup,
    support,
    dropped,
  };

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
let userTimingCounter = 0;
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
  /** The main thread's frame rate, from the native module — invisible to a JS rAF loop. */
  getUiFps(): number | undefined {
    return uiFps;
  },
  getFpsHistory(): number[] {
    return fpsHistory;
  },
  /** The highest frame rate seen since the last clear, across both threads. */
  getFpsPeak(): number {
    return fpsPeak;
  },
  getUiFpsHistory(): number[] {
    return uiFpsHistory;
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
  /** Cumulative — the count arrives per callback and each one reports only its own overflow. */
  addDropped(next: Partial<PerformanceDropped>) {
    if (!enabled || paused) return;
    dropped = {
      longTasks: dropped.longTasks + (next.longTasks ?? 0),
      interactions: dropped.interactions + (next.interactions ?? 0),
    };
    publish();
  },
  /** Reported by each collector as it installs, so the UI can say why a list is empty. */
  setSupport(next: Partial<PerformanceSupport>) {
    support = { ...support, ...next };
    publish(true);
  },
  setHistorySize(next: number) {
    historySize = Math.max(1, next);
  },
  /** Read once at attach — free space changes too slowly to sample. */
  setStorage(next: StorageInfo) {
    if (!enabled) return;
    storage = next;
    publish(true);
  },
  addSystemMemorySample(sample: SystemMemorySample) {
    if (!enabled || paused) return;
    systemMemory = [...systemMemory, sample].slice(-historySize);
    publish();
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
  addUserTiming(entries: Omit<UserTimingEntry, 'id' | 'timestamp'>[]) {
    if (!enabled || paused || entries.length === 0) return;
    const now = Date.now();
    const additions = entries.slice(-historySize).map((entry) => {
      userTimingCounter += 1;
      return { ...entry, id: `usertiming-${userTimingCounter}`, timestamp: now };
    });
    userTiming = [...additions.reverse(), ...userTiming].slice(0, historySize);
    publish();
  },
  clearUserTiming(predicate?: (entry: UserTimingEntry) => boolean) {
    if (predicate === undefined) userTiming = [];
    else userTiming = userTiming.filter((entry) => !predicate(entry));
    publish(true);
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
    if (next !== undefined) {
      fpsHistory = [...fpsHistory, next].slice(-FPS_HISTORY_SIZE);
      if (next > fpsPeak) fpsPeak = next;
    }
    publish();
  },
  setUiFps(next: number | undefined) {
    if (!enabled || paused) return;
    uiFps = next;
    if (next !== undefined) {
      uiFpsHistory = [...uiFpsHistory, next].slice(-FPS_HISTORY_SIZE);
      if (next > fpsPeak) fpsPeak = next;
    }
    publish();
  },
  clear() {
    memory = [];
    systemMemory = [];
    longTasks = [];
    userTiming = [];
    interactions = [];
    dropped = { longTasks: 0, interactions: 0 };
    fps = undefined;
    uiFps = undefined;
    fpsHistory = [];
    uiFpsHistory = [];
    fpsPeak = 0;
    publish(true);
  },
};
