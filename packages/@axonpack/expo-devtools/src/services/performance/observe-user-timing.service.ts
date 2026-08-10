import { performanceStore } from '../../stores/performance/performance.store';

type TimingEntryLike = {
  name: string;
  startTime: number;
  duration: number;
};

type ObserverHost = {
  supportedEntryTypes?: readonly string[];
  new (callback: (list: { getEntries: () => TimingEntryLike[] }) => void): {
    observe: (options: { type: string; buffered?: boolean }) => void;
    disconnect: () => void;
  };
};

type PerformanceHost = {
  getEntriesByType?: (type: string) => TimingEntryLike[];
};

const KINDS = ['mark', 'measure'] as const;

function record(kind: (typeof KINDS)[number], entry: TimingEntryLike) {
  performanceStore.addUserTiming({
    kind,
    name: entry.name,
    startTime: entry.startTime,
    duration: entry.duration,
  });
}

/**
 * `performance.mark`/`measure` an app makes itself. This is the only thing in the tab that can name
 * the code responsible for a slow stretch — a long task reports duration with an empty `attribution`
 * array, so user timing is how you turn "180 ms went somewhere" into "checkout render took 180 ms".
 */
export function observeUserTiming() {
  const Observer = (globalThis as unknown as { PerformanceObserver?: ObserverHost })
    .PerformanceObserver;
  const host = globalThis.performance as unknown as PerformanceHost | undefined;
  const supported = KINDS.filter((kind) => Observer?.supportedEntryTypes?.includes(kind));
  if (!Observer || supported.length === 0) return () => {};

  // Marks made before `init()` ran (or before this observer existed) are already on the native
  // timeline; `buffered` alone doesn't always replay them, so the buffer is read directly too. The
  // store de-duplicates on kind+name+startTime, so overlap between the two paths is harmless.
  for (const kind of supported) {
    try {
      for (const entry of host?.getEntriesByType?.(kind) ?? []) record(kind, entry);
    } catch {
      // getEntriesByType is optional on older runtimes — the observer below still covers new entries.
    }
  }

  const observers = supported.flatMap((kind) => {
    try {
      const observer = new Observer((list) => {
        for (const entry of list.getEntries()) record(kind, entry);
      });
      observer.observe({ type: kind, buffered: true });
      return [observer];
    } catch {
      return [];
    }
  });

  return () => {
    for (const observer of observers) observer.disconnect();
  };
}
