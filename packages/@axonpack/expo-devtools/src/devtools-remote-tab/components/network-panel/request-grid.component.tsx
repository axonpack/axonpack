import { useState } from 'react';

import { ColumnResizer } from './column-resizer.component';
import type { RequestPane } from './request-detail';
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
import { columnTemplate, dragAnchor, resizeColumns } from '../../utils/column-widths.util';

/**
 * Chrome's default columns, with the client that sent a request in place of Type, which only ever
 * said fetch or xhr, and Method, which the app row shows too. Name has no width of its own: it takes
 * what the others leave. Its floor is a fixed width rather than its content, so a long URL cannot push
 * the other columns off the side.
 */
const COLUMNS: { label: string; width: number; sortKey?: NetworkSortKey }[] = [
  { label: 'Name', width: 0 },
  { label: 'Method', width: 64 },
  { label: 'Status', width: 72, sortKey: 'status' },
  { label: 'Source', width: 120 },
  { label: 'Size', width: 72, sortKey: 'size' },
  { label: 'Time', width: 72, sortKey: 'duration' },
];

const NAME_MIN = 120;

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
  selectedId,
  onSelect,
}: {
  visible: readonly NetworkEntry[];
  total: number;
  /** The row open in the detail pane. While there is one, the table is its Name column alone. */
  selectedId: string | null;
  /** With a pane when a row's menu opens one of its editors. */
  onSelect: (id: string, pane?: RequestPane) => void;
}) {
  const { sort, settings } = useNetworkViewStore();
  const paused = useNetworkLogStore(networkLogStore.isPaused);
  // The panel's own business, like which rows are open: the app has no columns to share them with.
  const [widths, setWidths] = useState(() => COLUMNS.map((column) => column.width));
  const [dragging, setDragging] = useState<number | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const compact = selectedId !== null;

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
      style={{
        gridTemplateColumns: compact ? '1fr' : columnTemplate(widths, dragging, 0, NAME_MIN),
      }}>
      <div className="axonpack-net-row axonpack-net-head">
        {(compact ? COLUMNS.slice(0, 1) : COLUMNS).map(({ label, sortKey }) => (
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
      {!compact &&
        COLUMNS.slice(0, -1).map(({ label }, line) => (
          <ColumnResizer
            key={label}
            column={line + 1}
            anchor={dragAnchor(widths, line, 0)}
            dragging={dragging === line}
            onStart={() => setDragging(line)}
            onEnd={(delta) => {
              if (delta !== undefined)
                setWidths((current) => resizeColumns(current, line, delta, 0));
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
              compact={compact}
              selected={entry.id === selectedId}
              onSelect={onSelect}
              menuOpen={entry.id === menuId}
              onMenu={setMenuId}
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
