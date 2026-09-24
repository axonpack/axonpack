import { UsageMeter } from './usage-meter.component';
import { formatSize } from '../../../core/utils/format-bytes.util';
import {
  performanceStore,
  usePerformanceStore,
} from '../../../features/performance/stores/performance.store';

export function StorageCard() {
  const { storage, support } = usePerformanceStore(performanceStore.getSnapshot);

  const usedBytes =
    storage?.totalBytes !== undefined && storage.freeBytes !== undefined
      ? storage.totalBytes - storage.freeBytes
      : undefined;

  return (
    <section className="axonpack-perf-card" data-wide>
      <h3>Storage</h3>
      {!support.systemMemory ? (
        <p className="axonpack-perf-note">
          Needs a dev build. The rest of this tab works without one.
        </p>
      ) : storage === undefined ? (
        <p className="axonpack-perf-note">
          Android only. On iOS, reading it would make your App Store submission declare a disk-space
          reason.
        </p>
      ) : (
        <UsageMeter
          label="Used"
          usedBytes={usedBytes}
          totalBytes={storage.totalBytes}
          caption={
            storage.freeBytes !== undefined ? `${formatSize(storage.freeBytes)} free` : undefined
          }
        />
      )}
    </section>
  );
}
