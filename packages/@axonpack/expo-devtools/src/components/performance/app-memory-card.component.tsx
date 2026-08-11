import { useSyncExternalStore } from 'react';

import { MetricCard } from './metric-card.component';
import { performanceStore } from '../../stores/performance/performance.store';
import { formatSize } from '../../utils/format-bytes.util';
import { Sparkline } from '../ui/sparkline.ui';

/**
 * The app's real memory footprint, not the JS heap. The two are routinely off by a factor of several,
 * and this is the one a user means and the one the OS kills the app over — which is why the tab shows
 * both rather than letting the heap stand in for it.
 *
 * Subscribed on its own so the once-a-second sample re-renders this card alone.
 */
export function AppMemoryCard() {
  const { systemMemory, support } = useSyncExternalStore(
    performanceStore.subscribe,
    performanceStore.getSnapshot
  );

  // Rendered even with nothing to show, so the hint can say *why* — a bare dash reads the same whether
  // the native module is missing or the first sample simply hasn't landed.
  const latest = systemMemory.at(-1);
  const series = systemMemory
    .map((sample) => sample.appBytes)
    .filter((value): value is number => value !== undefined);

  return (
    <MetricCard
      label="App memory"
      value={formatSize(latest?.appBytes)}
      hint={
        !support.systemMemory
          ? 'Needs a development build — not available in Expo Go'
          : latest === undefined
            ? 'Waiting for the first sample'
            : latest.totalBytes !== undefined
              ? `of ${formatSize(latest.totalBytes)} on this device`
              : 'Whole process, not just the JS heap'
      }>
      {series.length > 1 ? <Sparkline values={series} /> : null}
    </MetricCard>
  );
}
