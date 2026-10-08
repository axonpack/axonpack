import { performanceStore } from '../../stores/performance.store';
import { startSystemMetricsSampling } from '../sample-system-metrics.service';

const stat = (tid: number, ticks: number) =>
  `${tid} (thread name) S 1 1 0 0 -1 0 0 0 0 0 ${ticks} 0 0 0 20 0 1 0 1 0 0`;

// Android shape by default: raw /proc lines and a tick rate.
const native: {
  reading: Record<string, unknown>;
} = { reading: {} };

jest.mock('expo', () => {
  const actual = jest.requireActual('expo');
  return {
    ...actual,
    requireOptionalNativeModule: () => ({
      getMemoryMetrics: () => ({ appBytes: 1 }),
      getCpuMetrics: () => native.reading,
    }),
  };
});

const android = (totalMs: number, jsTicks: number, mainTicks: number | null, jsThreadId = 7) => {
  native.reading = {
    cpuTimeMs: totalMs,
    coreCount: 4,
    clockTicksPerSecond: 100,
    jsThreadId,
    jsThreadStat: stat(jsThreadId, jsTicks),
    mainThreadStat: mainTicks === null ? null : stat(1, mainTicks),
  };
};

const lines = () =>
  performanceStore.getSnapshot().cpu.map(({ total, js, main }) => ({ total, js, main }));

describe('cpu sampling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    performanceStore.setEnabled(true);
    performanceStore.setPaused(false);
    performanceStore.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reports the whole app as a share of all cores and each thread as a share of one', () => {
    android(0, 0, 0);
    const stop = startSystemMetricsSampling(1000);
    expect(performanceStore.getSnapshot().support.cpu).toBe(true);
    expect(lines()).toEqual([]);

    android(1500, 100, 20); // 1.5 s of CPU on 4 cores, JS 1 s, main 0.2 s, over 1 s of wall time
    jest.advanceTimersByTime(1000);
    android(1750, 125, 25);
    jest.advanceTimersByTime(1000);
    stop();

    expect(lines()).toEqual([
      { total: 37.5, js: 100, main: 20 },
      { total: 6.25, js: 25, main: 5 },
    ]);
    expect(performanceStore.getSnapshot().cpu[0].cores).toBe(4);
  });

  it('reads iOS per-thread times as given', () => {
    const ios = (cpuTimeMs: number, js: number, main: number) => ({
      cpuTimeMs,
      coreCount: 6,
      jsThreadId: 3,
      jsThreadCpuMs: js,
      mainThreadCpuMs: main,
    });
    native.reading = ios(0, 0, 0);
    const stop = startSystemMetricsSampling(1000);
    native.reading = ios(1200, 300, 50);
    jest.advanceTimersByTime(1000);
    stop();

    expect(lines()).toEqual([{ total: 20, js: 30, main: 5 }]);
  });

  it('caps a thread at 100 when tick rounding puts it just over', () => {
    android(0, 0, 0);
    const stop = startSystemMetricsSampling(1000);
    android(1020, 102, 0); // 1.02 s of JS in 1 s of wall time can only be rounding
    jest.advanceTimersByTime(1000);
    stop();

    expect(lines()).toEqual([{ total: 25.5, js: 100, main: 0 }]);
  });

  it('leaves the whole app unmeasured when the core count is unknown', () => {
    android(0, 0, 0);
    native.reading.coreCount = null;
    const stop = startSystemMetricsSampling(1000);
    android(500, 50, 0);
    native.reading.coreCount = null;
    jest.advanceTimersByTime(1000);
    stop();

    expect(lines()).toEqual([{ total: undefined, js: 50, main: 0 }]);
  });

  it('starts the JS line again after a reload brings a new JS thread', () => {
    android(0, 500, 0, 7);
    const stop = startSystemMetricsSampling(1000);
    android(100, 2, 0, 9); // new thread, its counter starts near zero
    jest.advanceTimersByTime(1000);
    android(200, 12, 0, 9);
    jest.advanceTimersByTime(1000);
    stop();

    expect(lines()).toEqual([
      { total: 2.5, js: undefined, main: 0 },
      { total: 2.5, js: 10, main: 0 },
    ]);
  });

  it('leaves a thread it cannot read undefined, never 0', () => {
    android(0, 0, null);
    const stop = startSystemMetricsSampling(1000);
    android(100, 10, null);
    jest.advanceTimersByTime(1000);
    stop();

    expect(lines()).toEqual([{ total: 2.5, js: 10, main: undefined }]);
  });

  it('folds the burst of catch-up callbacks after a JS block into one sample', () => {
    android(0, 0, 0);
    const stop = startSystemMetricsSampling(1000);

    // JS is blocked for 10 s: no callback runs, then the first one sees 10 s of JS time.
    jest.setSystemTime(Date.now() + 9000);
    android(10_000, 1000, 0);
    jest.advanceTimersByTime(1000);

    // React Native then fires the missed callbacks a few ms apart. Each would be a 5 ms window.
    for (let i = 1; i <= 3; i += 1) {
      jest.setSystemTime(Date.now() - 995);
      android(10_000 + i * 10, 1000 + i, 0);
      jest.advanceTimersByTime(1000);
    }

    // The next on-time callback closes one window over the burst and the rest of the second.
    android(10_200, 1020, 0);
    jest.advanceTimersByTime(1000);
    stop();

    // Only two samples: the block itself, and one window of 1015 ms (the three 5 ms steps plus 1 s)
    // holding 200 ms of CPU, 200 ms of it on the JS thread.
    expect(lines()).toEqual([
      { total: 25, js: 100, main: 0 },
      {
        total: expect.closeTo((200 / 1015 / 4) * 100),
        js: expect.closeTo((200 / 1015) * 100),
        main: 0,
      },
    ]);
  });

  it('starts a fresh window after a restart instead of averaging over the gap', () => {
    android(0, 0, 0);
    startSystemMetricsSampling(1000)();
    android(60_000, 6000, 0);
    jest.advanceTimersByTime(60_000);

    const stop = startSystemMetricsSampling(1000);
    expect(lines()).toEqual([]);
    android(60_100, 6010, 0);
    jest.advanceTimersByTime(1000);
    stop();

    expect(lines()).toEqual([{ total: 2.5, js: 10, main: 0 }]);
  });
});
