import { performanceStore } from '../../stores/performance/performance.store';

type ObserverHost = {
  supportedEntryTypes?: readonly string[];
  new (
    callback: (list: {
      getEntries: () => { name: string; duration: number; startTime: number }[];
    }) => void
  ): {
    observe: (options: { type: string; buffered?: boolean; durationThreshold?: number }) => void;
    disconnect: () => void;
  };
};

/**
 * `supportedEntryTypes` is populated from what the native side actually implements, so it varies by
 * platform and RN version — gating on it at runtime is the only safe check.
 */
export function observeLongTasks(thresholdMs: number) {
  const Observer = (globalThis as unknown as { PerformanceObserver?: ObserverHost })
    .PerformanceObserver;
  if (!Observer?.supportedEntryTypes?.includes('longtask')) {
    performanceStore.setSupport({ longTasks: false });
    return () => {};
  }

  try {
    const observer = new Observer((list) => {
      performanceStore.addLongTasks(
        list.getEntries().map((entry) => ({
          name: entry.name,
          duration: entry.duration,
          startTime: entry.startTime,
        }))
      );
    });
    // `buffered` replays tasks that happened before the panel was ever opened — the ones during
    // startup are usually the interesting ones, and they are long gone by then.
    observer.observe({ type: 'longtask', buffered: true, durationThreshold: thresholdMs });
    performanceStore.setSupport({ longTasks: true });
    return () => observer.disconnect();
  } catch {
    performanceStore.setSupport({ longTasks: false });
    return () => {};
  }
}
