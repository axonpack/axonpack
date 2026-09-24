import { performanceStore } from '../../stores/performance.store';
import { startFpsMonitor } from '../fps-monitor.service';

jest.mock('expo', () => {
  const actual = jest.requireActual('expo');
  return {
    ...actual,
    requireOptionalNativeModule: () => ({
      startUiFpsTracking: () => native.starts++,
      stopUiFpsTracking: () => native.stops++,
      getUiFps: () => 58,
    }),
  };
});

const native = { starts: 0, stops: 0 };

describe('shared fps monitor', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    performanceStore.setEnabled(true);
    performanceStore.setPaused(false);
    performanceStore.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps counting until the last user leaves', () => {
    const releaseApp = startFpsMonitor();
    const releaseTab = startFpsMonitor();
    expect(native.starts).toBe(1);

    releaseApp();
    releaseApp();
    jest.advanceTimersByTime(1000);
    expect(native.stops).toBe(0);
    expect(performanceStore.getUiFps()).toBe(58);

    releaseTab();
    expect(native.stops).toBe(1);
    expect(performanceStore.getUiFps()).toBeUndefined();
  });
});
