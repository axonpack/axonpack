import { EventEmitter } from 'expo';

export type MemorySample = {
  timestamp: number;
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
};

export type LongTaskEntry = {
  id: string;

  timestamp: number;
  name: string;

  duration: number;

  startTime: number;
};

export type StartupTiming = {
  startTime?: number;
  endTime?: number;
  initializeRuntimeStart?: number;
  executeJavaScriptBundleEntryPointStart?: number;

  processStart?: number;
  nativeModuleInit?: number;
  jsBundleEval?: number;
  initCalled?: number;
  firstRender?: number;
};

export type UserTimingEntry = {
  id: string;
  timestamp: number;

  kind: 'mark' | 'measure';
  name: string;

  startTime: number;

  duration: number;

  detail?: string;
};

export type InteractionEntry = {
  id: string;
  timestamp: number;

  name: string;
  startTime: number;

  duration: number;

  processingDuration: number;
};

export type SystemMemorySample = {
  timestamp: number;
  appBytes?: number;
  totalBytes?: number;

  availableToAppBytes?: number;
};

export type StorageInfo = {
  totalBytes?: number;
  freeBytes?: number;
};

export type PerformanceDropped = {
  longTasks: number;
  interactions: number;
};

export type PerformanceSupport = {
  memory: boolean;

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
