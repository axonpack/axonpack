import { RESIZE_REACH, RESIZE_SLICE } from '../../constants/network-panel-css.const';

/**
 * The line on the right of column `column` (1-based), draggable anywhere down the table.
 *
 * An event reaches the app with no pointer position, so pressing the line lays a strip of thin
 * invisible slices across it. While the drag is on, the page itself turns the slice under the pointer
 * into the offset `--net-drag` (a `:has(:hover)` rule per slice), which the widths of the columns
 * either side already include, so they follow the pointer with no round trip. The app hears only the
 * slice it was let go over, and keeps those widths.
 *
 * The slices hang from the right edge of the column on the line's right, not from the line. A drag
 * trades width between the two columns, so that edge holds still while the line moves, and slices
 * that moved with the line would put a different one under a pointer that stood still.
 */
export function ColumnResizer({
  column,
  neighbourWidth,
  dragging,
  onStart,
  onEnd,
}: {
  column: number;
  /** The width of the column on the line's right, which is how far left of its edge the line is. */
  neighbourWidth: number;
  dragging: boolean;
  onStart: () => void;
  /** How far the line moved, or nothing when the drag was dropped. */
  onEnd: (delta?: number) => void;
}) {
  return (
    <>
      <span
        className="axonpack-net-resizer"
        // With a bare start line, the end of a positioned grid child is the grid's own right edge.
        style={{ gridColumn: `${column} / span 1` }}
        onMouseDown={onStart}
        // A press and release before the slices arrive: no drag, so nothing to keep.
        onMouseUp={() => onEnd()}
      />
      {dragging && (
        <span
          className="axonpack-net-resize-anchor"
          style={{ gridColumn: `${column + 1} / span 1` }}>
          <span
            className="axonpack-net-resize-slices"
            style={{ marginLeft: -neighbourWidth - RESIZE_REACH * RESIZE_SLICE }}
            onMouseLeave={() => onEnd()}>
            {Array.from({ length: 2 * RESIZE_REACH }, (_, slice) => (
              <span key={slice} onMouseUp={() => onEnd((slice - RESIZE_REACH) * RESIZE_SLICE)} />
            ))}
          </span>
        </span>
      )}
    </>
  );
}
