import { IdleState } from './idle-state.component';
import { themeStore, useThemeStore } from '../../../core/stores/theme.store';
import type { PerformanceListKey } from '../../../features/performance/components/entry-list.component';
import {
  performanceStore,
  usePerformanceStore,
} from '../../../features/performance/stores/performance.store';
import {
  formatMs,
  getLongTaskColor,
} from '../../../features/performance/utils/format-metrics.util';
import { formatLongTaskName } from '../../../features/performance/utils/long-task-name.util';

const EMPTY_TEXT: Record<PerformanceListKey, { supported: string; unsupported: string }> = {
  longTasks: {
    supported: 'Nothing has blocked the JS thread yet.',
    unsupported: "This device doesn't report long tasks.",
  },
  userTiming: {
    supported: 'No marks yet. Add devtools.mark() and devtools.measure() to your code.',
    unsupported: 'No marks yet. Add devtools.mark() and devtools.measure() to your code.',
  },
  interactions: {
    supported: 'No slow interactions yet.',
    unsupported: "This device doesn't report interaction timing.",
  },
};

const time = (timestamp: number) => new Date(timestamp).toLocaleTimeString();

export function EntryTable({ list }: { list: PerformanceListKey }) {
  const palette = useThemeStore(themeStore.getPalette);
  const { longTasks, userTiming, interactions, support, dropped } = usePerformanceStore(
    performanceStore.getSnapshot
  );
  const paused = usePerformanceStore(performanceStore.isPaused);

  const count =
    list === 'longTasks'
      ? longTasks.length
      : list === 'interactions'
        ? interactions.length
        : userTiming.length;
  const supported =
    list === 'longTasks'
      ? support.longTasks
      : list === 'interactions'
        ? support.interactions
        : true;
  const droppedForList =
    list === 'longTasks' ? dropped.longTasks : list === 'interactions' ? dropped.interactions : 0;

  const marker = (duration: number) => {
    const color = getLongTaskColor(duration, palette);
    return { color, bar: <span className="axonpack-perf-marker" style={{ background: color }} /> };
  };

  return (
    <>
      {list === 'longTasks' && count > 0 ? (
        <p className="axonpack-perf-note" data-list>
          These show when the thread was stuck, not what stuck it. Wrap your own code in
          devtools.mark() and devtools.measure() to find out.
        </p>
      ) : null}
      {list === 'interactions' && count > 0 ? (
        <p className="axonpack-perf-note" data-list>
          Times are rounded to 8 ms, and anything under 16 ms isn't reported.
        </p>
      ) : null}
      {droppedForList > 0 ? (
        <p className="axonpack-perf-note" data-list>
          {droppedForList} more happened before this list started keeping them.
        </p>
      ) : null}

      {count === 0 ? (
        paused ? (
          <IdleState startupBelow={false} />
        ) : (
          <p className="axonpack-perf-empty">
            {supported ? EMPTY_TEXT[list].supported : EMPTY_TEXT[list].unsupported}
          </p>
        )
      ) : (
        <table className="axonpack-perf-table">
          <tbody>
            {list === 'longTasks'
              ? longTasks.map((entry) => {
                  const { color, bar } = marker(entry.duration);
                  return (
                    <tr key={entry.id}>
                      <td>{bar}</td>
                      <td data-name>{formatLongTaskName(entry.name)}</td>
                      <td data-muted>{time(entry.timestamp)}</td>
                      <td data-duration style={{ color }}>
                        {formatMs(entry.duration)}
                      </td>
                    </tr>
                  );
                })
              : list === 'interactions'
                ? interactions.map((entry) => {
                    const { color, bar } = marker(entry.duration);
                    return (
                      <tr key={entry.id}>
                        <td>{bar}</td>
                        <td data-name>{entry.name}</td>
                        <td data-muted>handler {formatMs(entry.processingDuration)}</td>
                        <td data-duration style={{ color }}>
                          {formatMs(entry.duration)}
                        </td>
                      </tr>
                    );
                  })
                : userTiming.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <span
                          className="axonpack-perf-kind"
                          data-icon={entry.kind === 'mark' ? 'push-pin' : 'straighten'}
                          title={entry.kind === 'mark' ? 'Mark' : 'Measure'}
                        />
                      </td>
                      <td data-name>{entry.name}</td>
                      <td data-muted title={entry.detail}>
                        {entry.detail ?? ''}
                      </td>
                      <td data-muted>{time(entry.timestamp)}</td>
                      <td data-duration>
                        {entry.kind === 'mark' ? '–' : formatMs(entry.duration)}
                      </td>
                    </tr>
                  ))}
          </tbody>
        </table>
      )}
    </>
  );
}
