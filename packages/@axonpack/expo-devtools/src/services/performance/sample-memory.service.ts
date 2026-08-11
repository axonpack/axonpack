import { performanceStore } from '../../stores/performance/performance.store';

type MemoryHost = {
  memory?: {
    usedJSHeapSize?: number | null;
    totalJSHeapSize?: number | null;
  };
};

/**
 * Every read crosses JSI into Hermes (`hermes_allocatedBytes`/`hermes_heapSize`), so the interval is
 * deliberately coarse — sampling this at animation rates would make the profiler the slowdown it is
 * supposed to be measuring.
 */
export function startMemorySampling(intervalMs: number) {
  const host = globalThis.performance as unknown as MemoryHost | undefined;
  // `memory` is a getter that throws outright on a runtime with no implementation behind it (JSC,
  // V8), so even probing for it has to be guarded — not just reading it later.
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
      // A JSC/V8 runtime has no implementation behind this and throws; stop asking.
      clearInterval(timer);
    }
  };

  performanceStore.setSampleIntervalMs(intervalMs);
  const timer = setInterval(read, intervalMs);
  read();
  return () => clearInterval(timer);
}
