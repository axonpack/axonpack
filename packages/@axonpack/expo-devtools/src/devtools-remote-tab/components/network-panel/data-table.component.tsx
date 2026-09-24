import { useState } from 'react';

import { ColumnResizer } from './column-resizer.component';
import { columnTemplate, dragAnchor, resizeColumns } from '../../utils/column-widths.util';

const FLEX_MIN = 80;

/**
 * A table in the request pane, in the request table's own grid, so it reads the same and its column
 * lines drag the same way. Column `flex` stretches to fill the row; the rest have widths of their own.
 */
export function DataTable({
  columns,
  rows,
  flex,
}: {
  columns: { label: string; width: number }[];
  /** `tone` lands on the row as `data-tone`, for a row the CSS colours, like a socket message. */
  rows: { key: string; cells: string[]; tone?: string }[];
  flex: number;
}) {
  const [widths, setWidths] = useState(() => columns.map((column) => column.width));
  const [dragging, setDragging] = useState<number | null>(null);

  return (
    <div
      className="axonpack-net-grid"
      style={{ gridTemplateColumns: columnTemplate(widths, dragging, flex, FLEX_MIN) }}>
      <div className="axonpack-net-row axonpack-net-head">
        {columns.map(({ label }) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      {columns.slice(0, -1).map(({ label }, line) => (
        <ColumnResizer
          key={label}
          column={line + 1}
          anchor={dragAnchor(widths, line, flex)}
          dragging={dragging === line}
          onStart={() => setDragging(line)}
          onEnd={(delta) => {
            if (delta !== undefined)
              setWidths((current) => resizeColumns(current, line, delta, flex));
            setDragging(null);
          }}
        />
      ))}
      {rows.map(({ key, cells, tone }) => (
        <div key={key} className="axonpack-net-row" data-tone={tone}>
          {cells.map((cell, index) => (
            <span key={index} title={cell}>
              {cell}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
