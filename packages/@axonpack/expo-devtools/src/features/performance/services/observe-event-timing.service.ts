import { performanceStore } from '../stores/performance.store';

type EventEntryLike = {
  name: string;
  startTime: number;
  duration: number;
  processingStart?: number;
  processingEnd?: number;
};

type CallbackOptions = { droppedEntriesCount?: number };

type ObserverHost = {
  supportedEntryTypes?: readonly string[];
  new (
    callback: (
      list: { getEntries: () => EventEntryLike[] },
      observer: unknown,
      options?: CallbackOptions
    ) => void
  ): {
    observe: (options: { type: string; buffered?: boolean; durationThreshold?: number }) => void;
    takeRecords: () => EventEntryLike[];
    disconnect: () => void;
  };
};

const MIN_DURATION_THRESHOLD_MS = 16;

export function observeEventTiming(thresholdMs: number) {
  const Observer = (globalThis as unknown as { PerformanceObserver?: ObserverHost })
    .PerformanceObserver;
  if (!Observer?.supportedEntryTypes?.includes('event')) {
    performanceStore.setSupport({ interactions: false });
    return () => {};
  }

  try {
    const record = (entries: EventEntryLike[]) => {
      performanceStore.addInteractions(
        entries.map(({ name, startTime, duration, processingStart, processingEnd }) => ({
          name,
          startTime,
          duration,
          processingDuration:
            processingStart !== undefined && processingEnd !== undefined
              ? processingEnd - processingStart
              : 0,
        }))
      );
    };

    const observer = new Observer((list, _observer, options) => {
      record(list.getEntries());
      if (options?.droppedEntriesCount) {
        performanceStore.addDropped({ interactions: options.droppedEntriesCount });
      }
    });
    observer.observe({
      type: 'event',
      buffered: true,
      durationThreshold: Math.max(MIN_DURATION_THRESHOLD_MS, thresholdMs),
    });
    performanceStore.setSupport({ interactions: true });

    return () => {
      try {
        record(observer.takeRecords());
      } catch {}
      observer.disconnect();
    };
  } catch {
    performanceStore.setSupport({ interactions: false });
    return () => {};
  }
}
