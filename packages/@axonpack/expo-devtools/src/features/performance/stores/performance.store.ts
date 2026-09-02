import { EventEmitter } from 'expo';

/**
 * One reading of the JS heap, taken every `performance.sampleIntervalMs`. This is the JS engine's
 * heap, not the app's total memory — see `SystemMemorySample` for that.
 *
 * Both sizes are absent on a runtime with no `performance.memory` implementation (JSC, V8), which
 * the Performance tab reports rather than charting zeroes.
 */
export type MemorySample = {
  /** When the reading was taken, as `Date.now()` milliseconds. */
  timestamp: number;
  /** Bytes currently allocated on the JS heap. */
  usedJSHeapSize?: number;
  /** Bytes the JS heap has reserved from the OS — always at least `usedJSHeapSize`. */
  totalJSHeapSize?: number;
};

/**
 * A block of the JS thread long enough to drop frames, reported by `PerformanceObserver`. Only
 * blocks of at least `performance.longTaskThresholdMs` are kept.
 */
export type LongTaskEntry = {
  /** Unique id for this entry. */
  id: string;
  /** When it was recorded, as `Date.now()` milliseconds. */
  timestamp: number;
  /** What the platform called it — usually `'self'`; React Native rarely attributes further. */
  name: string;
  /** How long the thread was blocked, in milliseconds. */
  duration: number;
  /** When the block began, in `performance.now()` milliseconds since app start. */
  startTime: number;
};

/**
 * How long the app took to start, read once when recording begins. Every field is optional and most
 * are filled in only by a platform whose native code reports them, so the Startup section shows what
 * it has rather than guessing at the rest.
 *
 * The first four come from React Native's own `performance.rnStartupTiming`; the last five are this
 * package's, and the two native ones need the native module (so they are absent in Expo Go).
 */
export type StartupTiming = {
  /** React Native's start marker, in milliseconds. */
  startTime?: number;
  /** React Native's end-of-startup marker, in milliseconds. */
  endTime?: number;
  /** When the JS runtime began initialising, in milliseconds. */
  initializeRuntimeStart?: number;
  /** When the bundle's entry point began executing, in milliseconds. */
  executeJavaScriptBundleEntryPointStart?: number;
  /** True process start from the OS, as `Date.now()` milliseconds. Needs the native module. */
  processStart?: number;
  /** When this package's native module was initialised, as `Date.now()` milliseconds. */
  nativeModuleInit?: number;
  /** When this package's JS was first evaluated, as `Date.now()` milliseconds. */
  jsBundleEval?: number;
  /** When `devtools.init()` ran, as `Date.now()` milliseconds. */
  initCalled?: number;
  /** When the overlay first rendered, as `Date.now()` milliseconds — the end of a usable startup. */
  firstRender?: number;
};

/**
 * A mark or measure the app recorded through `devtools.mark()` / `devtools.measure()`, listed under
 * User timing in the Performance tab.
 */
export type UserTimingEntry = {
  /** Unique id for this entry. */
  id: string;
  /** When it was recorded, as `Date.now()` milliseconds. */
  timestamp: number;
  /** A point in time (`'mark'`) or a span between two (`'measure'`). */
  kind: 'mark' | 'measure';
  /** The name you passed. */
  name: string;
  /** Where the entry sits on the timeline, in `performance.now()` milliseconds since app start. */
  startTime: number;
  /** The span's length in milliseconds. Always `0` for a mark. */
  duration: number;
  /** Your `detail` value, rendered to a string for display. Absent when none was given. */
  detail?: string;
};

/**
 * A tap or key press that took at least `performance.interactionThresholdMs` to handle, from the
 * Event Timing API.
 */
export type InteractionEntry = {
  /** Unique id for this entry. */
  id: string;
  /** When it was recorded, as `Date.now()` milliseconds. */
  timestamp: number;
  /** The event type — `'click'`, `'keydown'`. */
  name: string;
  /** When the event fired, in `performance.now()` milliseconds since app start. */
  startTime: number;
  /** Event to next paint, in milliseconds — what the user actually waited. */
  duration: number;
  /** Time inside the handler itself, in milliseconds. `0` when the platform did not report it. */
  processingDuration: number;
};

/**
 * One reading of real device memory, from the native module — the app's actual footprint, unlike
 * `MemorySample`, which is only the JS heap. Every field is absent without the native module.
 */
export type SystemMemorySample = {
  /** When the reading was taken, as `Date.now()` milliseconds. */
  timestamp: number;
  /** The app's resident memory in bytes — the number the OS kills a process over. */
  appBytes?: number;
  /** Physical RAM on the device, in bytes. */
  totalBytes?: number;
  /** Bytes the app could still allocate before it is at risk. */
  availableToAppBytes?: number;
};

/** Device disk space, from the native module. Read once when recording begins. */
export type StorageInfo = {
  /** Total size of the volume in bytes. */
  totalBytes?: number;
  /** Free space in bytes. */
  freeBytes?: number;
};

/**
 * How many entries the platform reported but could not be delivered, per kind. Non-zero means the
 * observer's own buffer overflowed — the tab says so rather than showing a silently partial list.
 */
export type PerformanceDropped = {
  /** Long tasks dropped by the observer. */
  longTasks: number;
  /** Interactions dropped by the observer. */
  interactions: number;
};

/**
 * What this platform can actually measure, probed at startup. The Performance tab uses it to say a
 * section is unavailable rather than render an empty chart.
 */
export type PerformanceSupport = {
  /** `performance.memory` exists — true on Hermes, false on JSC and V8. */
  memory: boolean;
  /** The native module is present, so real device memory can be read. */
  systemMemory: boolean;
  /** `PerformanceObserver` supports `'longtask'` on this platform and RN version. */
  longTasks: boolean;
  /** `PerformanceObserver` supports `'event'` on this platform and RN version. */
  interactions: boolean;
};

/**
 * Everything the Performance tab holds, as one value. Each series keeps at most
 * `performance.historySize` entries, newest first, and is empty until recording starts — the
 * Performance tab defaults to paused.
 */
export type PerformanceSnapshot = {
  /** JS heap readings, oldest first. */
  memory: MemorySample[];
  /** Device memory readings, oldest first. */
  systemMemory: SystemMemorySample[];
  /** Disk space, read once. Absent without the native module. */
  storage?: StorageInfo;
  /** Recorded long tasks, newest first. */
  longTasks: LongTaskEntry[];
  /** Your marks and measures, newest first. */
  userTiming: UserTimingEntry[];
  /** Recorded slow interactions, newest first. */
  interactions: InteractionEntry[];
  /** Startup markers. Absent until they have been read. */
  startup?: StartupTiming;
  /** What this platform can measure. */
  support: PerformanceSupport;
  /** Entries the platform's observers dropped. */
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

let fps: number | undefined;
let uiFps: number | undefined;

const FPS_HISTORY_SIZE = 600;

const FPS_BUCKET_SAMPLES = 10;
const FPS_BUCKETS = 60;

type BucketState = {
  closed: number[];

  open?: number;
  openCount: number;
};

function emptyBuckets(): BucketState {
  return { closed: [], openCount: 0 };
}

function pushBucketSample(state: BucketState, value: number): BucketState {
  const open = state.open === undefined ? value : Math.min(state.open, value);
  const openCount = state.openCount + 1;
  if (openCount < FPS_BUCKET_SAMPLES) return { closed: state.closed, open, openCount };
  return { closed: [...state.closed, open].slice(-FPS_BUCKETS), openCount: 0 };
}

function bucketSeries(state: BucketState): number[] {
  return state.open === undefined ? state.closed : [...state.closed, state.open];
}

let fpsBucketState = emptyBuckets();
let uiFpsBucketState = emptyBuckets();

let fpsSeriesCache: number[] = [];
let uiFpsSeriesCache: number[] = [];

const FPS_WINDOW_HINT_MS = 500;
let fpsHistory: number[] = [];
let uiFpsHistory: number[] = [];

let fpsPeak = 0;

const PEAK_CONFIRMATIONS = 3;

const PEAK_TOLERANCE = 0.95;

type PeakRun = { candidate: number; count: number };
const jsPeakRun: PeakRun = { candidate: 0, count: 0 };
const uiPeakRun: PeakRun = { candidate: 0, count: 0 };

let heapPeak = 0;
let appMemoryPeak = 0;

let sampleIntervalMs = 1000;
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
let snapshotStale = false;

const MIN_NOTIFY_INTERVAL_MS = 250;
let lastNotifyAt = 0;
let pendingNotify: ReturnType<typeof setTimeout> | undefined;

function observePeak(run: PeakRun, value: number) {
  if (value <= fpsPeak) {
    run.candidate = 0;
    run.count = 0;
    return;
  }

  if (run.count > 0 && value >= run.candidate * PEAK_TOLERANCE) {
    run.count += 1;
  } else {
    run.candidate = value;
    run.count = 1;
  }

  if (run.count >= PEAK_CONFIRMATIONS) {
    fpsPeak = run.candidate;
    run.candidate = 0;
    run.count = 0;
  }
}

function notify() {
  lastNotifyAt = Date.now();
  emitter.emit('change');
}

function scheduleNotify(immediate = false) {
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

function publish(immediate = false) {
  snapshotStale = true;
  scheduleNotify(immediate);
}

let taskCounter = 0;
let userTimingCounter = 0;
let interactionCounter = 0;

export const performanceStore = {
  getSnapshot(): PerformanceSnapshot {
    if (snapshotStale) {
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
      snapshotStale = false;
    }
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
  getUiFps(): number | undefined {
    return uiFps;
  },
  getFpsHistory(): number[] {
    return fpsHistory;
  },
  getFpsSeries(): number[] {
    return fpsSeriesCache;
  },
  getUiFpsSeries(): number[] {
    return uiFpsSeriesCache;
  },
  getFpsBucketCount(): number {
    return FPS_BUCKETS;
  },
  getFpsBucketMs(): number {
    return FPS_BUCKET_SAMPLES * FPS_WINDOW_HINT_MS;
  },
  getFpsPeak(): number {
    const windowMax = Math.max(0, ...fpsHistory, ...uiFpsHistory);
    return fpsPeak <= windowMax ? fpsPeak : windowMax;
  },
  getHeapPeak(): number {
    return heapPeak;
  },
  getAppMemoryPeak(): number {
    return appMemoryPeak;
  },
  getSampleIntervalMs(): number {
    return sampleIntervalMs;
  },
  setSampleIntervalMs(next: number) {
    sampleIntervalMs = next;
  },
  getUiFpsHistory(): number[] {
    return uiFpsHistory;
  },
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
  addDropped(next: Partial<PerformanceDropped>) {
    if (!enabled || paused) return;
    dropped = {
      longTasks: dropped.longTasks + (next.longTasks ?? 0),
      interactions: dropped.interactions + (next.interactions ?? 0),
    };
    publish();
  },
  setSupport(next: Partial<PerformanceSupport>) {
    support = { ...support, ...next };
    publish(true);
  },
  getHistorySize(): number {
    return historySize;
  },
  setHistorySize(next: number) {
    historySize = Math.max(1, next);
  },
  setStorage(next: StorageInfo) {
    if (!enabled) return;
    storage = next;
    publish(true);
  },
  addSystemMemorySample(sample: SystemMemorySample) {
    if (!enabled || paused) return;
    systemMemory = [...systemMemory, sample].slice(-historySize);
    if (sample.appBytes !== undefined && sample.appBytes > appMemoryPeak) {
      appMemoryPeak = sample.appBytes;
    }
    publish();
  },
  addMemorySample(sample: MemorySample) {
    if (!enabled || paused) return;
    memory = [...memory, sample].slice(-historySize);
    if (sample.usedJSHeapSize !== undefined && sample.usedJSHeapSize > heapPeak) {
      heapPeak = sample.usedJSHeapSize;
    }
    publish();
  },
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
      fpsBucketState = pushBucketSample(fpsBucketState, next);
      fpsSeriesCache = bucketSeries(fpsBucketState);
      observePeak(jsPeakRun, next);
    }
    scheduleNotify();
  },
  setUiFps(next: number | undefined) {
    if (!enabled || paused) return;
    uiFps = next;
    if (next !== undefined) {
      uiFpsHistory = [...uiFpsHistory, next].slice(-FPS_HISTORY_SIZE);
      uiFpsBucketState = pushBucketSample(uiFpsBucketState, next);
      uiFpsSeriesCache = bucketSeries(uiFpsBucketState);
      observePeak(uiPeakRun, next);
    }
    scheduleNotify();
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
    fpsBucketState = emptyBuckets();
    uiFpsBucketState = emptyBuckets();
    fpsSeriesCache = [];
    uiFpsSeriesCache = [];
    fpsPeak = 0;
    jsPeakRun.candidate = 0;
    jsPeakRun.count = 0;
    uiPeakRun.candidate = 0;
    uiPeakRun.count = 0;
    heapPeak = 0;
    appMemoryPeak = 0;
    publish(true);
  },
};
