import { requireOptionalNativeModule } from 'expo';

import { performanceStore } from '../stores/performance.store';
import {
  capAtFull,
  parseTaskStatCpuMs,
  percentOfAllCores,
  percentOfOneCore,
} from '../utils/cpu-usage.util';

type SystemNativeModule = {
  getMemoryMetrics: () => {
    appBytes?: number | null;
    totalBytes?: number | null;
    availableToAppBytes?: number | null;
  };

  getStorageMetrics?: () => { totalBytes?: number | null; freeBytes?: number | null };

  // Optional because a dev build made before this existed still has the rest of the module.
  getCpuMetrics?: () => CpuReading;
};

type CpuReading = {
  cpuTimeMs: number;
  coreCount?: number | null;
  /** Identifies the thread the call ran on, which is the JS thread. A change means a new runtime. */
  jsThreadId?: number | null;
  /** iOS hands over per-thread times directly. */
  jsThreadCpuMs?: number | null;
  mainThreadCpuMs?: number | null;
  /** Android hands over raw `/proc` lines and the tick rate to read them with. */
  jsThreadStat?: string | null;
  mainThreadStat?: string | null;
  clockTicksPerSecond?: number | null;
};

type Window = { cpuMs: number; at: number } | undefined;

const native = requireOptionalNativeModule<SystemNativeModule>('AxonpackDevtools');

export function isSystemMetricsAvailable(): boolean {
  return native != null;
}

export function startSystemMetricsSampling(intervalMs: number) {
  performanceStore.setSupport({
    systemMemory: native != null,
    cpu: typeof native?.getCpuMetrics === 'function',
  });
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

  // Native hands over CPU time so far and the deltas are taken here, so each start begins a fresh
  // window and the first reading after a pause is not an average over the time spent paused.
  let lastTotal: Window;
  let lastJs: Window;
  let lastMain: Window;
  let lastJsThreadId: number | null | undefined;
  const readCpu = () => {
    if (!native.getCpuMetrics) return;
    // After the JS thread was blocked, React Native fires every missed interval back to back, a few ms
    // apart. A window that short is all clock-tick rounding (0% or 100%), so it stays open and the
    // burst becomes one sample over the whole block.
    if (lastTotal && Date.now() - lastTotal.at < intervalMs / 2) return;
    try {
      const reading = native.getCpuMetrics();
      const at = Date.now();
      const jsMs =
        reading.jsThreadCpuMs ??
        parseTaskStatCpuMs(reading.jsThreadStat, reading.clockTicksPerSecond);
      const mainMs =
        reading.mainThreadCpuMs ??
        parseTaskStatCpuMs(reading.mainThreadStat, reading.clockTicksPerSecond);

      // A reload brings a new JS thread whose counter starts again, so its line starts again too.
      if (reading.jsThreadId !== lastJsThreadId) lastJs = undefined;
      lastJsThreadId = reading.jsThreadId;

      const nextTotal = { cpuMs: reading.cpuTimeMs, at };
      const nextJs = jsMs === undefined ? undefined : { cpuMs: jsMs, at };
      const nextMain = mainMs === undefined ? undefined : { cpuMs: mainMs, at };

      const oneCore = percentOfOneCore(lastTotal, nextTotal);
      if (oneCore !== undefined) {
        const cores = reading.coreCount ?? undefined;
        performanceStore.addCpuSample({
          timestamp: at,
          cores,
          total: percentOfAllCores(oneCore, cores),
          js: nextJs && capAtFull(percentOfOneCore(lastJs, nextJs)),
          main: nextMain && capAtFull(percentOfOneCore(lastMain, nextMain)),
        });
      }
      lastTotal = nextTotal;
      lastJs = nextJs;
      lastMain = nextMain;
    } catch {}
  };

  const read = () => {
    readCpu();
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
