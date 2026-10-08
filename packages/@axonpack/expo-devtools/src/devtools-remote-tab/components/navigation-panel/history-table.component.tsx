import { useState } from 'react';

import { MoveRow } from './move-row.component';
import { themeStore, useThemeStore } from '../../../core/stores/theme.store';
import type { Matcher } from '../../../core/utils/text-search.util';
import type { NavigationMove } from '../../../features/navigation/stores/navigation.store';
import { columnTemplate, dragAnchor, resizeColumns } from '../../utils/column-widths.util';
import { ColumnResizer } from '../network-panel/column-resizer.component';

/** To takes what the others leave, since it carries the params. */
const COLUMNS = [
  { label: 'Time', width: 70 },
  { label: 'Action', width: 110 },
  { label: 'From', width: 120 },
  { label: 'To', width: 0 },
  { label: 'On screen', width: 80 },
  { label: 'Dispatched from', width: 180 },
];
const TO_COLUMN = 3;
const TO_MIN = 120;

/**
 * The app's history list as a table, newest first. Every row is drawn, with no windowing: the store
 * keeps 200 moves at most.
 */
export function HistoryTable({
  visible,
  total,
  stays,
  matcher,
  showContainer,
  selectedId,
  onSelect,
}: {
  visible: NavigationMove[];
  total: number;
  stays: Map<string, number | null>;
  matcher: Matcher | null;
  showContainer: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const palette = useThemeStore(themeStore.getPalette);
  const [widths, setWidths] = useState(() => COLUMNS.map((column) => column.width));
  const [dragging, setDragging] = useState<number | null>(null);

  return (
    <details open className="axonpack-net-section">
      <summary>History ({visible.length})</summary>
      <div
        className="axonpack-net-grid"
        style={{ gridTemplateColumns: columnTemplate(widths, dragging, TO_COLUMN, TO_MIN) }}>
        <div className="axonpack-net-row axonpack-net-head">
          {COLUMNS.map(({ label }) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        {COLUMNS.slice(0, -1).map(({ label }, line) => (
          <ColumnResizer
            key={label}
            column={line + 1}
            anchor={dragAnchor(widths, line, TO_COLUMN)}
            dragging={dragging === line}
            onStart={() => setDragging(line)}
            onEnd={(delta) => {
              if (delta !== undefined)
                setWidths((current) => resizeColumns(current, line, delta, TO_COLUMN));
              setDragging(null);
            }}
          />
        ))}
        {visible.map((move) => (
          <MoveRow
            key={move.id}
            move={move}
            stayed={stays.get(move.id) ?? null}
            matcher={matcher}
            palette={palette}
            showContainer={showContainer}
            selected={move.id === selectedId}
            onSelect={onSelect}
          />
        ))}
        {visible.length === 0 && (
          <p className="axonpack-net-empty">
            {total === 0 ? 'No moves recorded yet' : 'No moves match your filter'}
          </p>
        )}
      </div>
    </details>
  );
}
