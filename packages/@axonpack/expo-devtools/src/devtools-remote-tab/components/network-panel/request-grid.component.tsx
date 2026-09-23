import { useState } from 'react';

import { ColumnResizer } from './column-resizer.component';
import { RequestRow } from './request-row.component';
import {
  networkLogStore,
  useNetworkLogStore,
  type NetworkEntry,
} from '../../../features/network/stores/network-log.store';
import {
  networkViewStore,
  useNetworkViewStore,
} from '../../../features/network/stores/network-view.store';
import { formatSource } from '../../../features/network/utils/formatters.util';
import { groupBySource } from '../../../features/network/utils/group-by-source.util';
import type { NetworkSortKey } from '../../../features/network/utils/sort-entries.util';

/**
 * Chrome's default columns, with the client that sent a request in place of Type, which only ever
 * said fetch or xhr, and Method, which the app row shows too. Name has no width of its own: it takes
 * what the others leave, up to `NAME_MAX`, so a long URL cannot push them off the side.
 */
const COLUMNS: { label: string; width: number; sortKey?: NetworkSortKey }[] = [
  { label: 'Name', width: 0 },
  { label: 'Method', width: 64 },
  { label: 'Status', width: 72, sortKey: 'status' },
  { label: 'Source', width: 120 },
  { label: 'Size', width: 72, sortKey: 'size' },
  { label: 'Time', width: 72, sortKey: 'duration' },
];

const MIN_WIDTH = 40;
const NAME_MIN = 120;
const NAME_MAX = 600;

/**
 * Chrome's rule: a line moves space between the two columns beside it, so the line follows the
 * pointer and nothing else shifts. When the column on the left is Name, it takes its share on its own.
 */
function resizeColumns(widths: readonly number[], line: number, delta: number): number[] {
  const next = [...widths];
  const right = line + 1;
  let moved = Math.min(delta, next[right] - MIN_WIDTH);
  if (line > 0) moved = Math.max(moved, MIN_WIDTH - next[line]);
  if (line > 0) next[line] += moved;
  next[right] -= moved;
  return next;
}

/**
 * The grid's columns, plus an empty one for whatever Name is too capped to take. While a line is
 * dragged, the two columns beside it carry `--net-drag`, which the page sets from the slice under the
 * pointer, so they move before the app has heard anything. The drag is held to the same limits
 * `resizeColumns` keeps, so letting go does not jump.
 */
function columnTemplate(widths: readonly number[], dragging: number | null): string {
  const tracks = widths.map((width) => `${width}px`);
  tracks[0] = `minmax(${NAME_MIN}px, ${NAME_MAX}px)`;
  if (dragging !== null) {
    const right = dragging + 1;
    const most = `${widths[right] - MIN_WIDTH}px`;
    const drag =
      dragging === 0
        ? `min(var(--net-drag, 0px), ${most})`
        : `clamp(${MIN_WIDTH - widths[dragging]}px, var(--net-drag, 0px), ${most})`;
    if (dragging > 0) tracks[dragging] = `calc(${widths[dragging]}px + ${drag})`;
    tracks[right] = `calc(${widths[right]}px - ${drag})`;
  }
  return `${tracks.join(' ')} 1fr`;
}

/** Live counts for the rows that have them. Read here so a new message redraws only its own row. */
function countFor(entry: NetworkEntry): number | undefined {
  if (entry.kind === 'websocket') return networkLogStore.getWebSocketMessages(entry.id).length;
  if (entry.eventStream) return networkLogStore.getStreamEvents(entry.id).length;
  return undefined;
}

/**
 * Chrome's request table over the same filters, window and sort as the app's list, so both show the
 * same rows in the same order.
 *
 * Every row is drawn, with no windowing. The log holds 200 at most, only the rows that change cross
 * to the panel, and a tab cannot virtualise the usual way anyway: no scroll offset or measurement
 * reaches the app.
 */
export function RequestGrid({
  visible,
  total,
}: {
  visible: readonly NetworkEntry[];
  total: number;
}) {
  const { sort, settings } = useNetworkViewStore();
  const paused = useNetworkLogStore(networkLogStore.isPaused);
  // The panel's own business, like which rows are open: the app has no columns to share them with.
  const [widths, setWidths] = useState(() => COLUMNS.map((column) => column.width));
  const [dragging, setDragging] = useState<number | null>(null);

  const groups = settings.groupByFetchClient
    ? groupBySource(visible)
    : [{ title: null, data: visible }];

  function pressHeader(key: NetworkSortKey) {
    networkViewStore.setSort(
      sort.key === key ? { ...sort, descending: !sort.descending } : { key, descending: true }
    );
  }

  return (
    <div
      className="axonpack-net-grid"
      data-big={settings.devtoolsBigRows || undefined}
      style={{ gridTemplateColumns: columnTemplate(widths, dragging) }}>
      <div className="axonpack-net-row axonpack-net-head">
        {COLUMNS.map(({ label, sortKey }) => (
          <span
            key={label}
            data-sortable={sortKey ? true : undefined}
            onClick={sortKey ? () => pressHeader(sortKey) : undefined}>
            {label}
            {sortKey === sort.key && (
              <span data-icon={sort.descending ? 'arrow-down' : 'arrow-up'} />
            )}
          </span>
        ))}
      </div>
      {/* A line between each pair of columns. The last column has no neighbour to trade with. */}
      {COLUMNS.slice(0, -1).map(({ label }, line) => (
        <ColumnResizer
          key={label}
          column={line + 1}
          neighbourWidth={widths[line + 1]}
          dragging={dragging === line}
          onStart={() => setDragging(line)}
          onEnd={(delta) => {
            if (delta !== undefined) setWidths((current) => resizeColumns(current, line, delta));
            setDragging(null);
          }}
        />
      ))}
      {groups.map((group) => (
        <div key={group.title ?? ''}>
          {group.title !== null && (
            <div className="axonpack-net-group">
              {formatSource(group.title)} ({group.data.length})
            </div>
          )}
          {group.data.map((entry) => (
            <RequestRow
              key={entry.id}
              entry={entry}
              big={settings.devtoolsBigRows}
              count={countFor(entry)}
            />
          ))}
        </div>
      ))}
      {visible.length === 0 && (
        <p className="axonpack-net-empty">
          {total > 0
            ? 'No requests match the current filters.'
            : paused
              ? 'Recording is off. Press record to start.'
              : 'Recording network activity… Make a request in the app to see it here.'}
        </p>
      )}
    </div>
  );
}
