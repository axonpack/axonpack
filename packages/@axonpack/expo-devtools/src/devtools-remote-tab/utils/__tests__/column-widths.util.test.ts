import { columnTemplate, dragAnchor, resizeColumns } from '../column-widths.util';

// Name stretches at the front, Value in the middle: the two shapes the tab's tables have.
test('a line trades width between its two columns', () => {
  expect(resizeColumns([0, 64, 72, 120], 2, 30, 0)).toEqual([0, 64, 102, 90]);
});

test('the stretching column takes its side of a line on its own', () => {
  expect(resizeColumns([0, 64, 72], 0, 20, 0)).toEqual([0, 44, 72]);
  expect(resizeColumns([120, 0, 120], 0, 20, 1)).toEqual([140, 0, 120]);
  expect(resizeColumns([120, 0, 120], 1, 20, 1)).toEqual([120, 0, 100]);
});

test('no column is dragged below the floor, on either side', () => {
  expect(resizeColumns([0, 64, 72, 120], 2, -100, 0)).toEqual([0, 64, 40, 152]);
  expect(resizeColumns([0, 64, 72, 120], 2, 500, 0)).toEqual([0, 64, 152, 40]);
});

test('the template holds a drag to the same limits', () => {
  expect(columnTemplate([0, 64, 72], null, 0, 120)).toBe('minmax(120px, 1fr) 64px 72px');
  expect(columnTemplate([0, 64, 72], 1, 0, 120)).toBe(
    'minmax(120px, 1fr) calc(64px + clamp(-24px, var(--net-drag, 0px), 32px)) calc(72px - clamp(-24px, var(--net-drag, 0px), 32px))'
  );
});

test('slices hang from an edge that does not move', () => {
  expect(dragAnchor([0, 64, 72], 0, 0)).toEqual({ column: 2, edge: 'right', offset: -64 });
  expect(dragAnchor([120, 0, 120], 0, 1)).toEqual({ column: 1, edge: 'left', offset: 120 });
});
