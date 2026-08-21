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

describe('performanceStore snapshot identity', () => {
  beforeEach(() => {
    performanceStore.setEnabled(true);
    performanceStore.setPaused(false);
    performanceStore.clear();
  });

  it('keeps one snapshot object across frame-rate readings', () => {
    const before = performanceStore.getSnapshot();
    performanceStore.setFps(60);
    performanceStore.setUiFps(58);
    expect(performanceStore.getSnapshot()).toBe(before);
  });

  it('replaces it when data it does carry changes', () => {
    const before = performanceStore.getSnapshot();
    addTask('a');
    expect(performanceStore.getSnapshot()).not.toBe(before);
  });

  it('still reports the frame rate it was given', () => {
    performanceStore.setFps(42);
    expect(performanceStore.getFps()).toBe(42);
  });
});

describe('performanceStore frame-rate peak', () => {
  beforeEach(() => {
    performanceStore.setEnabled(true);
    performanceStore.setPaused(false);
    performanceStore.clear();
  });

  it('ignores a lone spike', () => {
    performanceStore.setFps(60);
    performanceStore.setFps(1005);
    performanceStore.setFps(60);
    expect(performanceStore.getFpsPeak()).toBe(60);
  });

  it('raises the peak once a high holds for three samples', () => {
    for (let index = 0; index < 3; index += 1) performanceStore.setFps(120);
    expect(performanceStore.getFpsPeak()).toBe(120);
  });

  it('needs the run to be unbroken', () => {
    performanceStore.setFps(120);
    performanceStore.setFps(120);
    performanceStore.setFps(60);
    performanceStore.setFps(120);
    expect(performanceStore.getFpsPeak()).toBe(0);
  });

  it('accepts a run that drifts slightly rather than repeating exactly', () => {
    performanceStore.setFps(118);
    performanceStore.setFps(120);
    performanceStore.setFps(119);
    expect(performanceStore.getFpsPeak()).toBe(118);
  });

  it('falls back to the window maximum when nothing supports the peak', () => {
    for (let index = 0; index < 3; index += 1) performanceStore.setFps(120);
    expect(performanceStore.getFpsPeak()).toBe(120);

    for (let index = 0; index < 600; index += 1) performanceStore.setFps(60);
    expect(performanceStore.getFpsPeak()).toBe(60);
  });

  it('counts both threads towards the same peak', () => {
    for (let index = 0; index < 3; index += 1) performanceStore.setUiFps(90);
    expect(performanceStore.getFpsPeak()).toBe(90);
  });

  it('confirms one thread while the other sits at the ceiling', () => {
    for (let index = 0; index < 3; index += 1) performanceStore.setFps(60);
    expect(performanceStore.getFpsPeak()).toBe(60);

    performanceStore.setFps(60);
    performanceStore.setUiFps(78);
    performanceStore.setFps(60);
    performanceStore.setUiFps(84);
    performanceStore.setFps(60);
    performanceStore.setUiFps(90);

    expect(performanceStore.getFpsPeak()).toBe(78);
  });

  it('keeps one thread run separate from the other', () => {
    for (let index = 0; index < 3; index += 1) performanceStore.setFps(60);

    performanceStore.setUiFps(90);
    performanceStore.setUiFps(90);

    performanceStore.setFps(60);
    performanceStore.setUiFps(90);

    expect(performanceStore.getFpsPeak()).toBe(90);
  });
});

describe('performanceStore frame-rate buckets', () => {
  beforeEach(() => {
    performanceStore.setEnabled(true);
    performanceStore.setPaused(false);
    performanceStore.clear();
  });

  it('freezes a bucket once it closes', () => {
    for (let index = 0; index < 10; index += 1) performanceStore.setFps(60);
    const [first] = performanceStore.getFpsSeries();

    for (let index = 0; index < 10; index += 1) performanceStore.setFps(20);
    expect(performanceStore.getFpsSeries()[0]).toBe(first);
  });

  it('shows the filling bucket as a provisional last point', () => {
    performanceStore.setFps(55);
    expect(performanceStore.getFpsSeries()).toEqual([55]);
  });

  it('takes the minimum of a bucket, so a stall survives', () => {
    for (let index = 0; index < 9; index += 1) performanceStore.setFps(60);
    performanceStore.setFps(9);
    expect(performanceStore.getFpsSeries()).toEqual([9]);
  });

  it('appends one point per closed bucket', () => {
    for (let index = 0; index < 30; index += 1) performanceStore.setFps(60);
    expect(performanceStore.getFpsSeries()).toHaveLength(3);
  });

  it('returns a stable reference when nothing was added', () => {
    performanceStore.setFps(60);
    const first = performanceStore.getFpsSeries();
    expect(performanceStore.getFpsSeries()).toBe(first);
  });
});
