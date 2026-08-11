import { performanceStore } from '../../stores/performance/performance.store';

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

/**
 * `supportedEntryTypes` is populated from what the native side implements, so it varies by platform and
 * RN version — gating on it at runtime is the only safe check.
 *
 * The threshold is applied here, not passed to `observe`. Long Tasks fixes its reporting threshold at
 * 50ms and states observers cannot configure it; `durationThreshold` belongs to Event Timing's partial
 * dictionary and is ignored for this entry type. Passing it looked like it worked only because the
 * default matched the spec's fixed value — a higher threshold silently did nothing. 50ms is therefore
 * a floor: a lower setting cannot surface more than the platform reports.
 */
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
    // `buffered` replays tasks from before the panel was opened — the startup ones are usually the
    // interesting ones, and they are long gone by then.
    observer.observe({ type: 'longtask', buffered: true });
    performanceStore.setSupport({ longTasks: true });

    return () => {
      // Anything queued but not yet delivered is lost on disconnect, so it's drained first.
      try {
        record(observer.takeRecords());
      } catch {
        // takeRecords is optional on older runtimes.
      }
      observer.disconnect();
    };
  } catch {
    performanceStore.setSupport({ longTasks: false });
    return () => {};
  }
}
