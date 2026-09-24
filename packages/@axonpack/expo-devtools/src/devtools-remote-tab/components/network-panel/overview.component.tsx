import { useMemo, useRef, useState } from 'react';

import { formatDuration } from '../../../core/utils/format-duration.util';
import {
  networkLogStore,
  useNetworkLogStore,
} from '../../../features/network/stores/network-log.store';
import {
  networkViewStore,
  useNetworkViewStore,
} from '../../../features/network/stores/network-view.store';
import { filterNetworkEntries } from '../../../features/network/utils/filter-entries.util';
import { layOutOverview } from '../../../features/network/utils/overview-layout.util';

/**
 * How finely a drag picks a window. The page cannot tell the app where the pointer is, only which
 * element it entered, so the overview is cut into this many invisible columns.
 */
const COLUMNS = 120;

const percent = (value: number) => `${value * 100}%`;

/**
 * Chrome's network overview: each request a bar across time, green while it waits for the first byte
 * and blue while the body comes in. Drag to pick a window, drag a handle to move one edge, and
 * double-click to let go. The window is the same one the in-app overview picks.
 *
 * While a drag is on, the page draws the window itself, anchored to the column under the pointer, the
 * way the tab bar's drag follows the pointer. The app hears only where the drag started and where it
 * ended. Asking it at every column made the window trail the pointer by a round trip, and re-filtered
 * the in-app list on every step.
 */
export function NetworkOverview() {
  const { filters, timeRange } = useNetworkViewStore();
  const logs = useNetworkLogStore(networkLogStore.getMergedSnapshot);
  const layout = useMemo(
    () => layOutOverview(filterNetworkEntries(logs, filters)),
    [logs, filters]
  );
  // The column the drag holds still. A handle holds the opposite edge.
  // State for drawing, and a ref for reading: a quick press and release can reach the app before
  // it has re-rendered, and a closure from the render before would see no drag at all.
  const [anchor, setAnchorState] = useState<number | null>(null);
  const held = useRef<number | null>(null);
  const setAnchor = (column: number | null) => {
    held.current = column;
    setAnchorState(column);
  };

  if (!layout) return <div className="axonpack-net-overview" />;

  const at = (time: number) => (time - layout.start) / layout.span;
  const columnTime = (column: number) => layout.start + (column / COLUMNS) * layout.span;
  const edgeColumn = (time: number) =>
    Math.min(COLUMNS - 1, Math.max(0, Math.round(at(time) * COLUMNS)));
  const finish = (column: number) => {
    const from = held.current;
    if (from === null) return;
    networkViewStore.setTimeRange({
      start: columnTime(Math.min(from, column)),
      end: columnTime(Math.max(from, column) + 1),
    });
    setAnchor(null);
  };

  return (
    <div
      className="axonpack-net-overview"
      data-dragging={anchor !== null || undefined}
      // Let go outside the columns: there is no column to read an end from, so the old window stays.
      onMouseLeave={() => setAnchor(null)}
      onDoubleClick={() => networkViewStore.setTimeRange(null)}>
      {layout.ticks.map((tick) => (
        <span
          key={tick}
          className="axonpack-net-ov-tick"
          style={{ left: percent(tick / layout.span) }}>
          <span>{formatDuration(tick)}</span>
        </span>
      ))}
      {layout.bars.map((bar) => (
        <span
          key={bar.id}
          className="axonpack-net-ov-bar"
          data-pending={bar.pending || bar.firstByteAt === undefined || undefined}
          style={{
            top: 16 + bar.row * 3,
            left: percent(at(bar.start)),
            width: percent((bar.end - bar.start) / layout.span),
          }}>
          {bar.firstByteAt !== undefined && !bar.pending && (
            <span
              className="axonpack-net-ov-wait"
              style={{ width: percent((bar.firstByteAt - bar.start) / (bar.end - bar.start || 1)) }}
            />
          )}
        </span>
      ))}
      {timeRange && anchor === null && (
        <>
          <span
            className="axonpack-net-ov-curtain"
            style={{ left: 0, width: percent(at(timeRange.start)) }}
          />
          <span
            className="axonpack-net-ov-curtain"
            style={{ left: percent(at(timeRange.end)), right: 0 }}
          />
        </>
      )}
      <div className="axonpack-net-ov-columns">
        {Array.from({ length: COLUMNS }, (_, column) => (
          <span
            key={column}
            data-anchor={column === anchor || undefined}
            onMouseDown={() => setAnchor(column)}
            onMouseUp={() => finish(column)}
          />
        ))}
      </div>
      {anchor !== null && <span className="axonpack-net-ov-drag" />}
      {timeRange && anchor === null && (
        <>
          <span
            className="axonpack-net-ov-handle"
            style={{ left: percent(at(timeRange.start)) }}
            onMouseDown={() => setAnchor(edgeColumn(timeRange.end) - 1)}
          />
          <span
            className="axonpack-net-ov-handle"
            style={{ left: percent(at(timeRange.end)) }}
            onMouseDown={() => setAnchor(edgeColumn(timeRange.start))}
          />
        </>
      )}
    </div>
  );
}
