import { requireOptionalNativeModule } from 'expo';

import { performanceStore } from '../../stores/performance/performance.store';

type SystemNativeModule = {
  getMemoryMetrics: () => {
    appBytes?: number | null;
    totalBytes?: number | null;
    availableToAppBytes?: number | null;
  };

  getStorageMetrics?: () => { totalBytes?: number | null; freeBytes?: number | null };
};

const native = requireOptionalNativeModule<SystemNativeModule>('AxonpackDevtools');

export function isSystemMetricsAvailable(): boolean {
  return native != null;
}

export function startSystemMetricsSampling(intervalMs: number) {
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
  } catch {}

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
