import { performanceStore } from '../performance.store';

function addTask(name: string, duration = 120) {
  performanceStore.addLongTasks([{ name, duration, startTime: 0 }]);
}

describe('performanceStore pause and resume', () => {
  beforeEach(() => {
    performanceStore.setEnabled(true);
    performanceStore.setPaused(false);
    performanceStore.clear();
  });

  it('records while running', () => {
    addTask('a');
    expect(performanceStore.getSnapshot().longTasks).toHaveLength(1);
  });

  it('drops entries that arrive while paused', () => {
    performanceStore.setPaused(true);
    addTask('while-paused');
    expect(performanceStore.getSnapshot().longTasks).toHaveLength(0);
  });

  it('keeps entries collected before pausing', () => {
    addTask('before');
    performanceStore.setPaused(true);
    expect(performanceStore.getSnapshot().longTasks).toHaveLength(1);
  });

  it('records again after resuming, and keeps what it had', () => {
    addTask('before');
    performanceStore.setPaused(true);
    addTask('during');
    performanceStore.setPaused(false);
    addTask('after');

    const names = performanceStore.getSnapshot().longTasks.map((entry) => entry.name);
    expect(names).toEqual(['after', 'before']);
  });

  it('publishes a new snapshot identity when pause state changes', () => {
    const before = performanceStore.getSnapshot();
    performanceStore.setPaused(true);
    expect(performanceStore.getSnapshot()).not.toBe(before);
  });
});

describe('performanceStore batching', () => {
  beforeEach(() => {
    performanceStore.setEnabled(true);
    performanceStore.setPaused(false);
    performanceStore.clear();
  });

  /**
   * Rendering the list is itself work that can exceed the long-task threshold, so an unbounded
   * notification rate lets the tab record its own renders forever. These two tests pin the ceiling.
   */
  it('coalesces a batch into a single notification', () => {
    jest.useFakeTimers();
    try {
      performanceStore.clear();
      let notifications = 0;
      const unsubscribe = performanceStore.subscribe(() => {
        notifications += 1;
      });

      performanceStore.addLongTasks(
        Array.from({ length: 500 }, (_, index) => ({
          name: `task-${index}`,
          duration: 60,
          startTime: index,
        }))
      );
      jest.advanceTimersByTime(300);

      unsubscribe();
      expect(notifications).toBe(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('coalesces a flood of separate batches into one notification per window', () => {
    jest.useFakeTimers();
    try {
      performanceStore.clear();
      let notifications = 0;
      const unsubscribe = performanceStore.subscribe(() => {
        notifications += 1;
      });

      // 50 arrivals inside one window — what a runaway feedback loop looks like.
      for (let index = 0; index < 50; index += 1) {
        performanceStore.addLongTasks([{ name: `task-${index}`, duration: 60, startTime: index }]);
        jest.advanceTimersByTime(4);
      }
      jest.advanceTimersByTime(300);

      unsubscribe();
      expect(notifications).toBeLessThanOrEqual(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('notifies at once when recording is toggled, so the button never lags', () => {
    let notifications = 0;
    const unsubscribe = performanceStore.subscribe(() => {
      notifications += 1;
    });
    performanceStore.setPaused(true);
    unsubscribe();
    performanceStore.setPaused(false);
    expect(notifications).toBe(1);
  });

  it('keeps only historySize entries, newest first', () => {
    performanceStore.setHistorySize(3);
    performanceStore.addLongTasks([
      { name: 'a', duration: 60, startTime: 1 },
      { name: 'b', duration: 60, startTime: 2 },
      { name: 'c', duration: 60, startTime: 3 },
      { name: 'd', duration: 60, startTime: 4 },
    ]);
    expect(performanceStore.getSnapshot().longTasks.map((entry) => entry.name)).toEqual([
      'd',
      'c',
      'b',
    ]);
    performanceStore.setHistorySize(120);
  });
});
