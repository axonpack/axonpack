/** The narrowest a column can be dragged to. */
export const MIN_WIDTH = 40;

/**
 * Chrome's rule: a line moves space between the two columns beside it, so the line follows the
 * pointer and nothing else shifts. One column in a table stretches to fill the row (`flex`), and it
 * takes its share on its own, so only the other side of its line is resized. Its own width is unused.
 */
export function resizeColumns(
  widths: readonly number[],
  line: number,
  delta: number,
  flex: number
): number[] {
  const next = [...widths];
  const left = line;
  const right = line + 1;
  let moved = delta;
  if (right !== flex) moved = Math.min(moved, next[right] - MIN_WIDTH);
  if (left !== flex) moved = Math.max(moved, MIN_WIDTH - next[left]);
  if (left !== flex) next[left] += moved;
  if (right !== flex) next[right] -= moved;
  return next;
}

/**
 * The grid's columns. While a line is dragged, the columns beside it carry `--net-drag`, which the
 * page sets from the slice under the pointer, so they move before the app has heard anything. The
 * drag is held to the limits `resizeColumns` keeps, so letting go does not jump.
 */
export function columnTemplate(
  widths: readonly number[],
  dragging: number | null,
  flex: number,
  flexMin: number
): string {
  const tracks = widths.map((width) => `${width}px`);
  tracks[flex] = `minmax(${flexMin}px, 1fr)`;
  if (dragging === null) return tracks.join(' ');

  const left = dragging;
  const right = dragging + 1;
  const drag = 'var(--net-drag, 0px)';
  const least = left === flex ? undefined : `${MIN_WIDTH - widths[left]}px`;
  const most = right === flex ? undefined : `${widths[right] - MIN_WIDTH}px`;
  const held =
    least && most
      ? `clamp(${least}, ${drag}, ${most})`
      : least
        ? `max(${least}, ${drag})`
        : most
          ? `min(${drag}, ${most})`
          : drag;
  if (left !== flex) tracks[left] = `calc(${widths[left]}px + ${held})`;
  if (right !== flex) tracks[right] = `calc(${widths[right]}px - ${held})`;
  return tracks.join(' ');
}

/**
 * Where a line's slices hang from: an edge that holds still while the line moves, and how far the
 * line is from it. The far edge of the column on the right, unless that column stretches and so has
 * no known width, in which case the near edge of the column on the left. Columns are 1-based here,
 * as grid lines are.
 */
export function dragAnchor(
  widths: readonly number[],
  line: number,
  flex: number
): { column: number; edge: 'left' | 'right'; offset: number } {
  if (line + 1 === flex) return { column: line + 1, edge: 'left', offset: widths[line] };
  return { column: line + 2, edge: 'right', offset: -widths[line + 1] };
}
