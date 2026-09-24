import { MemoryPlot } from './memory-plot.component';
import { UsageMeter } from './usage-meter.component';
import { formatSize } from '../../../core/utils/format-bytes.util';
import {
  performanceStore,
  usePerformanceStore,
} from '../../../features/performance/stores/performance.store';
import { ageAxisLabels } from '../../../features/performance/utils/age-labels.util';

export function MemoryCard() {
  const { memory, systemMemory, support } = usePerformanceStore(performanceStore.getSnapshot);
  const heapPeak = usePerformanceStore(performanceStore.getHeapPeak);
  const appPeak = usePerformanceStore(performanceStore.getAppMemoryPeak);
  const intervalMs = usePerformanceStore(performanceStore.getSampleIntervalMs);
  const capacity = usePerformanceStore(performanceStore.getHistorySize);
  const xLabels = ageAxisLabels(capacity, intervalMs);

  const heapSeries = memory
    .map((sample) => sample.usedJSHeapSize)
    .filter((value): value is number => value !== undefined);
  const appSeries = systemMemory
    .map((sample) => sample.appBytes)
    .filter((value): value is number => value !== undefined);

  const latestHeap = memory.at(-1);
  const totalDeviceMemory = systemMemory.at(-1)?.totalBytes;
  const availableDeviceMemory = systemMemory.at(-1)?.availableToAppBytes;
  const usedDeviceMemory =
    totalDeviceMemory !== undefined && availableDeviceMemory !== undefined
      ? totalDeviceMemory - availableDeviceMemory
      : undefined;

  return (
    <section className="axonpack-perf-card" data-wide>
      <h3>Memory</h3>

      <MemoryPlot
        title="JS Heap"
        latest={latestHeap?.usedJSHeapSize}
        caption={
          !support.memory
            ? "This JS engine doesn't report it"
            : latestHeap?.totalJSHeapSize !== undefined
              ? `of ${formatSize(latestHeap.totalJSHeapSize)} allocated`
              : 'Waiting for the first sample'
        }
        values={heapSeries}
        peak={heapPeak}
        capacity={capacity}
        xLabels={xLabels}
      />

      <hr />

      <MemoryPlot
        title="App memory"
        latest={systemMemory.at(-1)?.appBytes}
        caption={
          !support.systemMemory
            ? 'Needs a dev build'
            : appSeries.length === 0
              ? 'Waiting for the first sample'
              : undefined
        }
        values={appSeries}
        peak={appPeak}
        capacity={capacity}
        xLabels={xLabels}
      />

      {support.systemMemory && (
        <>
          <hr />
          <UsageMeter
            label="Device memory"
            usedBytes={usedDeviceMemory}
            totalBytes={totalDeviceMemory}
            caption={
              availableDeviceMemory !== undefined
                ? `${formatSize(availableDeviceMemory)} available to this app`
                : undefined
            }
          />
        </>
      )}
    </section>
  );
}
