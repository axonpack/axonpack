import {
  SECTIONS,
  type PerformanceSection,
} from '../../../features/performance/components/section-chips.component';
import {
  performanceStore,
  usePerformanceStore,
} from '../../../features/performance/stores/performance.store';

/** The device's toolbar in Chrome's parts: record, clear, then the sections as toggles. */
export function PerformanceToolbar({
  section,
  onSection,
}: {
  section: PerformanceSection;
  onSection: (section: PerformanceSection) => void;
}) {
  const recording = !usePerformanceStore(performanceStore.isPaused);
  const { longTasks, userTiming, interactions } = usePerformanceStore(performanceStore.getSnapshot);
  const counts: Partial<Record<PerformanceSection, number>> = {
    longTasks: longTasks.length,
    userTiming: userTiming.length,
    interactions: interactions.length,
  };

  return (
    <div className="axonpack-net-bar" role="toolbar" aria-label="Performance">
      <button
        className="axonpack-net-button"
        data-icon={recording ? 'record-stop' : 'record-start'}
        data-red={recording || undefined}
        aria-pressed={recording}
        title={recording ? 'Stop recording' : 'Start recording'}
        onClick={() => performanceStore.setPaused(recording)}
      />
      <button
        className="axonpack-net-button"
        data-icon="clear"
        title="Clear recorded data"
        onClick={performanceStore.clear}
      />
      <span className="axonpack-net-divider" />
      <span className="axonpack-net-types">
        {SECTIONS.map(({ key, label }) => (
          <button
            key={key}
            className="axonpack-net-type"
            aria-pressed={section === key}
            onClick={() => onSection(key)}>
            {counts[key] ? `${label} ${counts[key]}` : label}
          </button>
        ))}
      </span>
    </div>
  );
}
