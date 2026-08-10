import { useSyncExternalStore } from 'react';

import { MetricCard } from './metric-card.component';
import { performanceStore } from '../../stores/performance/performance.store';
import { getFpsColor } from '../../utils/performance/format-metrics.util';

export function FpsCard() {
  const fps = useSyncExternalStore(performanceStore.subscribe, performanceStore.getFps);

  return (
    <MetricCard
      label="JS thread FPS"
      value={fps !== undefined ? String(fps) : '–'}
      valueColor={getFpsColor(fps)}
      hint="JS thread only, not native UI"
    />
  );
}
