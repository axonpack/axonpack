import { performanceStore } from '../stores/performance.store';

type MemoryHost = {
  memory?: {
    usedJSHeapSize?: number | null;
    totalJSHeapSize?: number | null;
  };
};

export function startMemorySampling(intervalMs: number) {
  const host = globalThis.performance as unknown as MemoryHost | undefined;

  try {
    if (!host?.memory) {
      performanceStore.setSupport({ memory: false });
      return () => {};
    }
  } catch {
    performanceStore.setSupport({ memory: false });
    return () => {};
  }
  performanceStore.setSupport({ memory: true });

  const read = () => {
    try {
      const { usedJSHeapSize, totalJSHeapSize } = host.memory ?? {};
      performanceStore.addMemorySample({
        timestamp: Date.now(),
        usedJSHeapSize: usedJSHeapSize ?? undefined,
        totalJSHeapSize: totalJSHeapSize ?? undefined,
      });
    } catch {
      clearInterval(timer);
    }
  };

  performanceStore.setSampleIntervalMs(intervalMs);
  const timer = setInterval(read, intervalMs);
  read();
  return () => clearInterval(timer);
}
