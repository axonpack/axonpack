import { isUiFpsAvailable } from '../../../features/performance/services/fps-monitor.service';
import { performanceStore } from '../../../features/performance/stores/performance.store';

const COLLECTS = [
  'Frame rate, for both the JS and main threads',
  'Memory, both the JS heap and the whole app',
  'Long tasks, when the JS thread got stuck',
  'Slow taps',
];

export function IdleState({ startupBelow = true }: { startupBelow?: boolean }) {
  const footnote = [
    startupBelow ? 'Startup timing is already below, since it is captured at launch.' : undefined,
    isUiFpsAvailable() ? undefined : 'Main-thread FPS and device memory need a dev build.',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="axonpack-perf-idle">
      <span className="axonpack-perf-idle-badge" />
      <h3>Not recording</h3>
      <p className="axonpack-perf-muted">
        Measuring has a small cost, so it's off until you turn it on.
      </p>
      <ul>
        {COLLECTS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <button className="axonpack-perf-start" onClick={() => performanceStore.setPaused(false)}>
        Start recording
      </button>
      {footnote ? <p className="axonpack-perf-note">{footnote}</p> : null}
    </div>
  );
}
