import { formatDuration } from '../../../../core/utils/format-duration.util';
import type { NetworkLogEntry } from '../../../../features/network/stores/network-log.store';
import {
  hasMeasuredPhase,
  layOutPhases,
} from '../../../../features/network/utils/phase-layout.util';

type Bar = { label: string; offset: number; width: number; ms: number; phase: string };

/**
 * The platform's phases where it measured them, and the two numbers JavaScript always has where it
 * did not. Never both, for the reason the app's Timing tab gives: they start at different moments.
 */
function bars(entry: NetworkLogEntry): Bar[] {
  if (entry.phases && hasMeasuredPhase(entry.phases)) {
    return layOutPhases(entry.phases, entry.duration).map((phase) => ({
      label: phase.label,
      offset: phase.offsetPercent,
      width: phase.widthPercent,
      ms: phase.value,
      phase: phase.key,
    }));
  }
  const total = entry.duration;
  if (total === undefined || entry.ttfb === undefined || total <= 0) return [];
  const wait = Math.min(entry.ttfb, total);
  return [
    {
      label: 'Waiting for server response',
      offset: 0,
      width: (wait / total) * 100,
      ms: wait,
      phase: 'waitMs',
    },
    {
      label: 'Content Download',
      offset: (wait / total) * 100,
      width: ((total - wait) / total) * 100,
      ms: total - wait,
      phase: 'downloadMs',
    },
  ];
}

export function TimingTab({ entry }: { entry: NetworkLogEntry }) {
  const rows = bars(entry);

  return (
    <div className="axonpack-net-timing">
      <p className="axonpack-net-none">
        Started at {new Date(entry.startedAt).toLocaleTimeString()}
        {entry.phases && hasMeasuredPhase(entry.phases) ? '' : ', timed from JavaScript'}
      </p>
      {rows.map((row) => (
        <div key={row.label} className="axonpack-net-timing-row">
          <span>{row.label}</span>
          <span className="axonpack-net-timing-track">
            <span
              data-phase={row.phase}
              style={{ left: `${row.offset}%`, width: `${row.width}%` }}
            />
          </span>
          <span>{formatDuration(row.ms)}</span>
        </div>
      ))}
      <div className="axonpack-net-timing-row axonpack-net-timing-total">
        <span />
        <span />
        <span>{entry.duration === undefined ? 'Pending' : formatDuration(entry.duration)}</span>
      </div>
    </div>
  );
}
