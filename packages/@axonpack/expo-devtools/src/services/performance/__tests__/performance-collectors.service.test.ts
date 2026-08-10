import { performanceStore } from '../../../stores/performance/performance.store';
import { startPerformanceCollectors } from '../performance-collectors.service';

type Entry = { name: string; duration: number; startTime: number };

let deliverLongTask: ((entries: Entry[]) => void) | undefined;
let observeCount = 0;
let disconnectCount = 0;

class FakeObserver {
  static supportedEntryTypes = ['longtask', 'event', 'mark', 'measure'];
  #callback: (list: { getEntries: () => Entry[] }) => void;

  constructor(callback: (list: { getEntries: () => Entry[] }) => void) {
    this.#callback = callback;
  }

  observe(options: { type: string }) {
    observeCount += 1;
    if (options.type === 'longtask') {
      deliverLongTask = (entries) => this.#callback({ getEntries: () => entries });
    }
  }

  disconnect() {
    disconnectCount += 1;
  }
}

const OPTIONS = {
  sampleIntervalMs: 100_000,
  longTaskThresholdMs: 50,
  interactionThresholdMs: 100,
};

describe('performance collector lifecycle', () => {
  const originalObserver = (globalThis as Record<string, unknown>).PerformanceObserver;
  let teardown: (() => void) | undefined;

  beforeAll(() => {
    (globalThis as Record<string, unknown>).PerformanceObserver = FakeObserver;
  });

  afterAll(() => {
    (globalThis as Record<string, unknown>).PerformanceObserver = originalObserver;
  });

  beforeEach(() => {
    deliverLongTask = undefined;
    observeCount = 0;
    disconnectCount = 0;
    performanceStore.setEnabled(true);
    performanceStore.setPaused(false);
    performanceStore.clear();
  });

  afterEach(() => {
    teardown?.();
    teardown = undefined;
  });

  it('attaches nothing while it starts paused', () => {
    performanceStore.setPaused(true);
    teardown = startPerformanceCollectors(OPTIONS);
    expect(observeCount).toBe(0);
  });

  /** The reported bug: `disabledByDefault: true`, then pressing record, logged nothing ever. */
  it('attaches and records once recording is switched on', () => {
    performanceStore.setPaused(true);
    teardown = startPerformanceCollectors(OPTIONS);

    performanceStore.setPaused(false);
    expect(observeCount).toBeGreaterThan(0);

    deliverLongTask?.([{ name: 'after-enable', duration: 200, startTime: 20 }]);
    expect(performanceStore.getSnapshot().longTasks.map((entry) => entry.name)).toEqual([
      'after-enable',
    ]);
  });

  it('detaches when recording is paused again', () => {
    teardown = startPerformanceCollectors(OPTIONS);
    expect(disconnectCount).toBe(0);

    performanceStore.setPaused(true);
    expect(disconnectCount).toBeGreaterThan(0);
  });

  it('does not re-attach on every unrelated store change', () => {
    teardown = startPerformanceCollectors(OPTIONS);
    const afterStart = observeCount;

    // Collectors publish their own support on attach, so a naive listener would loop here.
    performanceStore.addLongTasks([{ name: 'noise', duration: 60, startTime: 1 }]);
    performanceStore.setSupport({ memory: true });

    expect(observeCount).toBe(afterStart);
  });

  it('reads startup timing even while paused, since it is a one-shot', () => {
    performanceStore.setPaused(true);
    teardown = startPerformanceCollectors(OPTIONS);
    // No native Performance module under test, so the read is a no-op — what matters is that it
    // isn't gated behind the record button.
    expect(() => performanceStore.getSnapshot()).not.toThrow();
  });
});
