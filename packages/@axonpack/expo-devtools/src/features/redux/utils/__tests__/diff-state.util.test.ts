import { diffState, formatStatePath, MAX_CHANGES } from '../diff-state.util';

describe('diffState', () => {
  it('lists leaf changes, additions and removals by path', () => {
    const shared = { big: [1, 2, 3] };
    const before = { count: 1, user: { name: 'a', token: 't' }, shared, todos: [{ done: false }] };
    const after = { count: 2, user: { name: 'a', id: 7 }, shared, todos: [{ done: true }] };

    expect(diffState(before, after)).toEqual([
      { path: ['count'], kind: 'changed', before: 1, after: 2 },
      { path: ['user', 'token'], kind: 'removed', before: 't' },
      { path: ['user', 'id'], kind: 'added', after: 7 },
      { path: ['todos', '0', 'done'], kind: 'changed', before: false, after: true },
    ]);
  });

  it('is empty for the same reference', () => {
    const state = { a: 1 };
    expect(diffState(state, state)).toEqual([]);
  });

  it('treats an array replaced by an object, or a primitive root, as one change', () => {
    expect(diffState({ a: [] }, { a: {} })).toEqual([
      { path: ['a'], kind: 'changed', before: [], after: {} },
    ]);
    expect(diffState(1, 2)).toEqual([{ path: [], kind: 'changed', before: 1, after: 2 }]);
  });

  it('stops at the cap', () => {
    const after = Object.fromEntries(Array.from({ length: MAX_CHANGES + 50 }, (_, i) => [i, i]));
    expect(diffState({}, after)).toHaveLength(MAX_CHANGES);
  });
});

describe('formatStatePath', () => {
  it('writes indexes in brackets', () => {
    expect(formatStatePath(['todos', '2', 'done'])).toBe('todos[2].done');
    expect(formatStatePath([])).toBe('(state)');
  });
});
