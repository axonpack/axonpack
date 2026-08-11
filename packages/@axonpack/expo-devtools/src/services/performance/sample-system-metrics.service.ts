import { requireOptionalNativeModule } from 'expo';

import { performanceStore } from '../../stores/performance/performance.store';

type SystemNativeModule = {
  getMemoryMetrics: () => {
    appBytes?: number | null;
    totalBytes?: number | null;
    availableToAppBytes?: number | null;
  };
  /** Android only — see the Swift module for why iOS omits it. Hence the optional call below. */
  getStorageMetrics?: () => { totalBytes?: number | null; freeBytes?: number | null };
};

const native = requireOptionalNativeModule<SystemNativeModule>('AxonpackDevtools');

export function isSystemMetricsAvailable(): boolean {
  return native != null;
}

/**
 * The app's real footprint and the device's RAM, which the JS heap reading cannot stand in for — Hermes
 * reports its own heap, typically a small fraction of what the process actually holds. This is the
 * number a user means by "memory", and reading it needs native code on both platforms.
 */
export function startSystemMetricsSampling(intervalMs: number) {
  // Reported either way, so the cards can say "needs a development build" instead of showing a dash
  // that looks identical to "not measured yet".
  performanceStore.setSupport({ systemMemory: native != null });
  if (native == null) return () => {};

  try {
    const storage = native.getStorageMetrics?.();
    if (storage) {
      performanceStore.setStorage({
        totalBytes: storage.totalBytes ?? undefined,
        freeBytes: storage.freeBytes ?? undefined,
      });
    }
  } catch {
    // Storage is a nice-to-have; the memory sampling below is the part that matters.
  }

  const read = () => {
    try {
      const { appBytes, totalBytes, availableToAppBytes } = native.getMemoryMetrics();
      performanceStore.addSystemMemorySample({
        timestamp: Date.now(),
        appBytes: appBytes ?? undefined,
        totalBytes: totalBytes ?? undefined,
        availableToAppBytes: availableToAppBytes ?? undefined,
      });
    } catch {
      clearInterval(timer);
    }
  };

  const timer = setInterval(read, intervalMs);
  read();
  return () => clearInterval(timer);
}
