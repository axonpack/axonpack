import { performanceStore } from '../../stores/performance/performance.store';

type EventEntryLike = {
  name: string;
  startTime: number;
  duration: number;
  processingStart?: number;
  processingEnd?: number;
};

type ObserverHost = {
  supportedEntryTypes?: readonly string[];
  new (callback: (list: { getEntries: () => EventEntryLike[] }) => void): {
    observe: (options: { type: string; buffered?: boolean; durationThreshold?: number }) => void;
    disconnect: () => void;
  };
};

/**
 * How long an interaction took from the user's point of view. `duration` is event-to-next-paint —
 * the wait they actually felt — while `processingStart`/`processingEnd` bound the handler itself, so
 * the gap between the two says whether the delay was your handler or the queue in front of it.
 */
export function observeEventTiming(thresholdMs: number) {
  const Observer = (globalThis as unknown as { PerformanceObserver?: ObserverHost })
    .PerformanceObserver;
  if (!Observer?.supportedEntryTypes?.includes('event')) return () => {};

  try {
    const observer = new Observer((list) => {
      for (const entry of list.getEntries()) {
        const { processingStart, processingEnd } = entry;
        performanceStore.addInteraction({
          name: entry.name,
          startTime: entry.startTime,
          duration: entry.duration,
          processingDuration:
            processingStart !== undefined && processingEnd !== undefined
              ? processingEnd - processingStart
              : 0,
        });
      }
    });
    observer.observe({ type: 'event', buffered: true, durationThreshold: thresholdMs });
    return () => observer.disconnect();
  } catch {
    return () => {};
  }
}
