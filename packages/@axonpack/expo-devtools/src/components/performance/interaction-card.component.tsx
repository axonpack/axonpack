import { useSyncExternalStore } from 'react';

import { performanceStore } from '../../stores/performance/performance.store';
import { formatMs } from '../../utils/performance/format-metrics.util';
import { MetricCard } from './metric-card.component';

/**
 * Worst as the headline, average underneath. The worst case is what a user remembers, but on its own a
 * single 3-second outlier reads as if the app is always that bad — the average is the context that stops
 * one bad tap from defining the picture.
 */
export function InteractionCard() {
  const { interactions } = useSyncExternalStore(
    performanceStore.subscribe,
    performanceStore.getSnapshot
  );

  const worst = interactions.reduce<number | undefined>(
    (highest, entry) =>
      highest === undefined || entry.duration > highest ? entry.duration : highest,
    undefined
  );
  const average =
    interactions.length > 0
      ? interactions.reduce((total, entry) => total + entry.duration, 0) / interactions.length
      : undefined;

  return (
    <MetricCard
      label="Interactions"
      value={formatMs(worst)}
      hint={
        average !== undefined
          ? `worst · ${formatMs(average)} average of ${interactions.length}`
          : 'Slowest event to next paint'
      }
    />
  );
}
