import { RESIZE_REACH, RESIZE_SLICE } from '../../constants/network-panel-css.const';

/**
 * The line between the table and the request pane, draggable. The same way as a column's line (see
 * `column-resizer.component.tsx`): slices laid across it while the drag is on, `--net-split-drag`
 * set by the page from the one under the pointer, and the app told only where it was let go.
 *
 * The slices hang from the table's left edge, which holds still while the line moves.
 */
export function SplitResizer({
  width,
  dragging,
  onStart,
  onEnd,
}: {
  /** The table's width as the app has it, which is how far the line is from that edge. */
  width: number;
  dragging: boolean;
  onStart: () => void;
  onEnd: (delta?: number) => void;
}) {
  return (
    <>
      <span className="axonpack-net-split">
        <span onMouseDown={onStart} onMouseUp={() => onEnd()} />
      </span>
      {dragging && (
        <span className="axonpack-net-split-anchor">
          <span
            className="axonpack-net-resize-slices"
            style={{ marginLeft: width - RESIZE_REACH * RESIZE_SLICE }}
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
