import {
  performanceStore,
  usePerformanceStore,
} from '../../../features/performance/stores/performance.store';
import { formatMs } from '../../../features/performance/utils/format-metrics.util';

export function InteractionCard() {
  const { interactions } = usePerformanceStore(performanceStore.getSnapshot);

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
    <section className="axonpack-perf-card">
      <h3>Interactions</h3>
      <strong className="axonpack-perf-value">{formatMs(worst)}</strong>
      <p className="axonpack-perf-note">
        {average !== undefined
          ? `worst · ${formatMs(average)} average of ${interactions.length}`
          : 'Slowest event to next paint'}
      </p>
    </section>
  );
}
