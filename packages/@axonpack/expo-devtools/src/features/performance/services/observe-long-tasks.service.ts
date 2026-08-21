import { performanceStore } from '../stores/performance.store';

type LongTaskEntryLike = { name: string; duration: number; startTime: number };

type CallbackOptions = { droppedEntriesCount?: number };

type ObserverHost = {
  supportedEntryTypes?: readonly string[];
  new (
    callback: (
      list: { getEntries: () => LongTaskEntryLike[] },
      observer: unknown,
      options?: CallbackOptions
    ) => void
  ): {
    observe: (options: { type: string; buffered?: boolean }) => void;
    takeRecords: () => LongTaskEntryLike[];
    disconnect: () => void;
  };
};

export function observeLongTasks(thresholdMs: number) {
  const Observer = (globalThis as unknown as { PerformanceObserver?: ObserverHost })
    .PerformanceObserver;
  if (!Observer?.supportedEntryTypes?.includes('longtask')) {
    performanceStore.setSupport({ longTasks: false });
    return () => {};
  }

  const record = (entries: LongTaskEntryLike[]) => {
    performanceStore.addLongTasks(
      entries
        .filter((entry) => entry.duration >= thresholdMs)
        .map((entry) => ({
          name: entry.name,
          duration: entry.duration,
          startTime: entry.startTime,
        }))
    );
  };

  try {
    const observer = new Observer((list, _observer, options) => {
      record(list.getEntries());
      if (options?.droppedEntriesCount) {
        performanceStore.addDropped({ longTasks: options.droppedEntriesCount });
      }
    });

    observer.observe({ type: 'longtask', buffered: true });
    performanceStore.setSupport({ longTasks: true });

    return () => {
      try {
        record(observer.takeRecords());
      } catch {}
      observer.disconnect();
    };
  } catch {
    performanceStore.setSupport({ longTasks: false });
    return () => {};
  }
}
