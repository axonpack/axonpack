import { performanceStore } from '../../../stores/performance/performance.store';
import { observeLongTasks } from '../observe-long-tasks.service';

type Entry = { name: string; duration: number; startTime: number };

let deliver: ((entries: Entry[], dropped?: number) => void) | undefined;
let queued: Entry[] = [];
let observeCalls: unknown[] = [];

class FakeObserver {
  static supportedEntryTypes = ['longtask', 'event'];

  constructor(
    callback: (
      list: { getEntries: () => Entry[] },
      observer: unknown,
      options?: { droppedEntriesCount?: number }
    ) => void
  ) {
    deliver = (entries, dropped) =>
      callback({ getEntries: () => entries }, this, { droppedEntriesCount: dropped });
  }

  observe(options: unknown) {
    observeCalls.push(options);
  }

  takeRecords(): Entry[] {
    return queued;
  }

  disconnect() {}
}

describe('observeLongTasks across pause and resume', () => {
  const original = (globalThis as Record<string, unknown>).PerformanceObserver;

  beforeAll(() => {
    (globalThis as Record<string, unknown>).PerformanceObserver = FakeObserver;
  });

  afterAll(() => {
    (globalThis as Record<string, unknown>).PerformanceObserver = original;
  });

  beforeEach(() => {
    deliver = undefined;
    queued = [];
    observeCalls = [];
    performanceStore.setEnabled(true);
    performanceStore.setPaused(false);
    performanceStore.clear();
  });

  it('records entries while running', () => {
    observeLongTasks(50);
    deliver?.([{ name: 'self', duration: 120, startTime: 10 }]);
    expect(performanceStore.getSnapshot().longTasks).toHaveLength(1);
  });

  /**
   * The reported bug: starting paused (`performance.disabledByDefault`) and then pressing record
   * left the list permanently empty, while starting unpaused worked.
   */
  it('records entries after starting paused and then resuming', () => {
    performanceStore.setPaused(true);
    observeLongTasks(50);

    deliver?.([{ name: 'while-paused', duration: 200, startTime: 10 }]);
    expect(performanceStore.getSnapshot().longTasks).toHaveLength(0);

    performanceStore.setPaused(false);
    deliver?.([{ name: 'after-resume', duration: 200, startTime: 20 }]);

    const names = performanceStore.getSnapshot().longTasks.map((entry) => entry.name);
    expect(names).toEqual(['after-resume']);
  });

  it('reports support so the empty state can explain itself', () => {
    observeLongTasks(50);
    expect(performanceStore.getSnapshot().support.longTasks).toBe(true);
  });

  /**
   * Long Tasks fixes its threshold at 50ms and ignores `durationThreshold`, so filtering has to happen
   * on our side or a higher setting silently does nothing.
   */
  it('does not pass durationThreshold, which the spec ignores for longtask', () => {
    observeLongTasks(50);
    expect(observeCalls[0]).toEqual({ type: 'longtask', buffered: true });
  });

  it('applies the threshold itself', () => {
    observeLongTasks(150);
    deliver?.([
      { name: 'self', duration: 80, startTime: 1 },
      { name: 'self', duration: 200, startTime: 2 },
    ]);
    expect(performanceStore.getSnapshot().longTasks.map((entry) => entry.duration)).toEqual([200]);
  });

  it('records how many entries the platform dropped', () => {
    observeLongTasks(50);
    deliver?.([{ name: 'self', duration: 90, startTime: 1 }], 34);
    expect(performanceStore.getSnapshot().dropped.longTasks).toBe(34);
  });

  it('drains queued records before disconnecting, instead of losing them', () => {
    const stop = observeLongTasks(50);
    queued = [{ name: 'self', duration: 120, startTime: 9 }];
    stop();
    expect(performanceStore.getSnapshot().longTasks.map((entry) => entry.duration)).toEqual([120]);
  });
});
