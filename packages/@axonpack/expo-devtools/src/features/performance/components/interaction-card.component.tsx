import { useSyncExternalStore } from 'react';

import { performanceStore } from '../stores/performance.store';
import { formatMs } from '../utils/format-metrics.util';
import { MetricCard } from './metric-card.component';

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
