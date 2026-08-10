import { useSyncExternalStore } from 'react';

import { MetricCard } from './metric-card.component';
import { performanceStore } from '../../stores/performance/performance.store';
import { formatSize } from '../../utils/format-bytes.util';
import { Sparkline } from '../ui/sparkline.ui';

/** Subscribed on its own, so the once-a-second sample doesn't re-render the panel's entry list. */
export function HeapCard() {
  const { memory, support } = useSyncExternalStore(
    performanceStore.subscribe,
    performanceStore.getSnapshot
  );

  const latest = memory.at(-1);
  const usedSeries = memory
    .map((sample) => sample.usedJSHeapSize)
    .filter((value): value is number => value !== undefined);

  return (
    <MetricCard
      label="JS heap"
      value={formatSize(latest?.usedJSHeapSize)}
      hint={
        latest?.totalJSHeapSize !== undefined
          ? `of ${formatSize(latest.totalJSHeapSize)} allocated`
          : support.memory
            ? 'Waiting for the first sample'
            : 'Not available on this engine'
      }>
      {usedSeries.length > 1 ? <Sparkline values={usedSeries} /> : null}
    </MetricCard>
  );
}
