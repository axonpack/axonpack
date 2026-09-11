import { expect, test } from 'bun:test';

import {
  buildPreview,
  chunkArrayRange,
  collectExpandablePaths,
  isExpandable,
  isPlainObject,
} from './json-tree.util';

test('chunkArrayRange buckets inclusive ranges and keeps the short tail', () => {
  expect(chunkArrayRange(0)).toEqual([]);
  expect(chunkArrayRange(3)).toEqual([[0, 2]]);
  expect(chunkArrayRange(10)).toEqual([[0, 9]]);
  expect(chunkArrayRange(23)).toEqual([
    [0, 9],
    [10, 19],
    [20, 22],
  ]);
});

test('isExpandable/isPlainObject treat null as a leaf', () => {
  expect(isPlainObject(null)).toBe(false);
  expect(isExpandable(null)).toBe(false);
  expect(isExpandable([])).toBe(true);
  expect(isExpandable({})).toBe(true);
  expect(isExpandable('{}')).toBe(false);
});

test('buildPreview shows content, capped, and marks the overflow', () => {
  expect(buildPreview({})).toBe('{}');
  expect(buildPreview([])).toBe('[]');
  expect(buildPreview({ id: 1, ok: true, nil: null })).toBe('{id: 1, ok: true, nil: null}');
  expect(buildPreview({ a: { b: 1 }, c: [1] })).toBe('{a: {…}, c: […]}');
  // Fifth entry dropped without an ellipsis: only the 80-char cap adds one.
  expect(buildPreview([1, 2, 3, 4, 5])).toBe('[1, 2, 3, 4]');
  expect(buildPreview(['x'.repeat(90)]).endsWith(', …]')).toBe(true);
});

test('collectExpandablePaths encodes chunk buckets and skips leaves', () => {
  expect(collectExpandablePaths('$', 1)).toEqual([]);
  expect(collectExpandablePaths('$', { a: { b: 1 }, c: 2 })).toEqual(['$', '$.a']);

  const long = Array.from({ length: 12 }, (_, index) => ({ index }));
  const paths = collectExpandablePaths('$', long);
  expect(paths).toContain('$#0-9');
  expect(paths).toContain('$#0-9.0');
  expect(paths).toContain('$#10-11.1');
  // Bucketed arrays are never addressed by flat index.
  expect(paths).not.toContain('$.11');
});
