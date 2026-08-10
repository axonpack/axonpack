import { EventEmitter } from 'expo';

export type MemorySample = {
  timestamp: number;
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
};

export type LongTaskEntry = {
  id: string;
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

export type UserTimingEntry = {
  id: string;
  kind: 'mark' | 'measure';
  name: string;
  startTime: number;
  /** Always 0 for a mark — it's a point on the timeline, not a span. */
  duration: number;
};

export type InteractionEntry = {
  id: string;
  /** The event type, e.g. `touchstart`, `click`. */
  name: string;
  startTime: number;
  /** Event to next paint — what the user actually waited. */
  duration: number;
  /** How long the handler itself held the JS thread, a subset of `duration`. */
  processingDuration: number;
};

export type PerformanceSnapshot = {
  memory: MemorySample[];
  longTasks: LongTaskEntry[];
  userTiming: UserTimingEntry[];
  interactions: InteractionEntry[];
  startup?: StartupTiming;
  fps?: number;
};

type PerformanceEvents = {
  change: () => void;
};

const DEFAULT_HISTORY_SIZE = 120;

let historySize = DEFAULT_HISTORY_SIZE;
let memory: MemorySample[] = [];
let longTasks: LongTaskEntry[] = [];
let userTiming: UserTimingEntry[] = [];
let interactions: InteractionEntry[] = [];
let startup: StartupTiming | undefined;
let fps: number | undefined;
let paused = false;
let enabled = false;

const emitter = new EventEmitter<PerformanceEvents>();

function keyOf(entry: UserTimingEntry): string {
  return `${entry.kind}:${entry.name}:${entry.startTime}`;
}

let snapshot: PerformanceSnapshot = {
  memory,
  longTasks,
  userTiming,
  interactions,
  startup,
  fps,
};

function publish() {
  snapshot = { memory, longTasks, userTiming, interactions, startup, fps };
  emitter.emit('change');
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
  setEnabled(nextEnabled: boolean) {
    enabled = nextEnabled;
    publish();
  },
  setPaused(nextPaused: boolean) {
    paused = nextPaused;
    publish();
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
  addLongTask(task: Omit<LongTaskEntry, 'id'>) {
    if (!enabled || paused) return;
    taskCounter += 1;
    longTasks = [{ ...task, id: `longtask-${taskCounter}` }, ...longTasks].slice(0, historySize);
    publish();
  },
  addUserTiming(entry: Omit<UserTimingEntry, 'id'>) {
    if (!enabled || paused) return;
    userTimingCounter += 1;
    const key = `${entry.kind}:${entry.name}:${entry.startTime}`;
    if (userTiming.some((existing) => keyOf(existing) === key)) return;
    userTiming = [{ ...entry, id: `usertiming-${userTimingCounter}` }, ...userTiming].slice(
      0,
      historySize
    );
    publish();
  },
  addInteraction(entry: Omit<InteractionEntry, 'id'>) {
    if (!enabled || paused) return;
    interactionCounter += 1;
    interactions = [{ ...entry, id: `interaction-${interactionCounter}` }, ...interactions].slice(
      0,
      historySize
    );
    publish();
  },
  /** Read once at startup, so it isn't gated on `paused` the way sampled data is. */
  setStartup(next: StartupTiming) {
    if (!enabled) return;
    startup = next;
    publish();
  },
  /**
   * Not part of the ring buffer — only the latest value is ever shown, and the rAF loop that feeds it
   * runs solely while the tab is visible.
   */
  setFps(next: number | undefined) {
    if (!enabled || paused) return;
    fps = next;
    publish();
  },
  clear() {
    memory = [];
    longTasks = [];
    userTiming = [];
    interactions = [];
    fps = undefined;
    publish();
  },
};
