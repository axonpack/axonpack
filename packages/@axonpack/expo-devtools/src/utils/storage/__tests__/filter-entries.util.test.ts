import type { StorageEntry } from '../../../stores/storage/storage.store';
import { buildMatcher, DEFAULT_SEARCH_MODES } from '../../text-search.util';
import type { StoredValueKind } from '../classify-value.util';
import {
  DEFAULT_STORAGE_FILTERS,
  hasActiveFilters,
  matchesFilters,
  sortEntries,
  type StorageFilters,
} from '../filter-entries.util';

function entry(key: string, text: string | null, kind: StoredValueKind = 'string'): StorageEntry {
  return {
    adapterId: 'memory',
    key,
    text,
    valueType: 'string',
    kind,
    size: text?.length ?? 0,
  };
}

function filters(patch: Partial<StorageFilters> = {}): StorageFilters {
  return { ...DEFAULT_STORAGE_FILTERS, ...patch };
}

function matcherFor(text: string) {
  return buildMatcher({ text, ...DEFAULT_SEARCH_MODES });
}

describe('matchesFilters search scope', () => {
  const token = entry('auth:token', 'secret-value');

  it('searches keys and values together by default', () => {
    expect(matchesFilters(token, filters(), matcherFor('auth'))).toBe(true);
    expect(matchesFilters(token, filters(), matcherFor('secret'))).toBe(true);
  });

  it('searches only keys when scoped to keys', () => {
    const scoped = filters({ scope: 'keys' });
    expect(matchesFilters(token, scoped, matcherFor('auth'))).toBe(true);
    expect(matchesFilters(token, scoped, matcherFor('secret'))).toBe(false);
  });

  it('searches only values when scoped to values', () => {
    const scoped = filters({ scope: 'values' });
    expect(matchesFilters(token, scoped, matcherFor('auth'))).toBe(false);
    expect(matchesFilters(token, scoped, matcherFor('secret'))).toBe(true);
  });

  it('matches everything when the query is empty', () => {
    expect(matchesFilters(token, filters(), null)).toBe(true);
  });
});

describe('matchesFilters type and hide toggles', () => {
  it('filters by the classified type', () => {
    const json = entry('config', '{}', 'json-object');
    expect(matchesFilters(json, filters({ kind: 'json-object' }), null)).toBe(true);
    expect(matchesFilters(json, filters({ kind: 'string' }), null)).toBe(false);
  });

  it('hides empty and missing values together', () => {
    const hidden = filters({ hideEmpty: true });
    expect(matchesFilters(entry('a', '', 'empty'), hidden, null)).toBe(false);
    expect(matchesFilters(entry('b', null, 'absent'), hidden, null)).toBe(false);
    expect(matchesFilters(entry('c', 'x'), hidden, null)).toBe(true);
  });

  it('keeps only containers when JSON only is on', () => {
    const jsonOnly = filters({ jsonOnly: true });
    expect(matchesFilters(entry('a', '{}', 'json-object'), jsonOnly, null)).toBe(true);
    expect(matchesFilters(entry('b', '[]', 'json-array'), jsonOnly, null)).toBe(true);
    expect(matchesFilters(entry('c', 'x'), jsonOnly, null)).toBe(false);
  });

  it('inverts the search and the type chip but not the hide toggles', () => {
    const inverted = filters({ invert: true, hideEmpty: true });

    expect(matchesFilters(entry('a', 'x'), inverted, matcherFor('a'))).toBe(false);
    expect(matchesFilters(entry('b', 'x'), inverted, matcherFor('a'))).toBe(true);
    // Still hidden — inverting would resurrect exactly what the toggle suppresses.
    expect(matchesFilters(entry('c', '', 'empty'), inverted, matcherFor('zzz'))).toBe(false);
  });
});

describe('hasActiveFilters', () => {
  it('is false for the defaults and true for any change', () => {
    expect(hasActiveFilters(DEFAULT_STORAGE_FILTERS)).toBe(false);
    expect(hasActiveFilters(filters({ search: 'a' }))).toBe(true);
    expect(hasActiveFilters(filters({ scope: 'keys' }))).toBe(true);
    expect(hasActiveFilters(filters({ kind: 'string' }))).toBe(true);
    expect(hasActiveFilters(filters({ jsonOnly: true }))).toBe(true);
  });
});

describe('sortEntries', () => {
  const entries = [entry('b', 'xx'), entry('a', 'xxxx'), entry('c', '{}', 'json-object')];

  it('sorts by key both ways', () => {
    expect(sortEntries(entries, 'key', false).map((it) => it.key)).toEqual(['a', 'b', 'c']);
    expect(sortEntries(entries, 'key', true).map((it) => it.key)).toEqual(['c', 'b', 'a']);
  });

  it('sorts by size, largest first when descending', () => {
    expect(sortEntries(entries, 'size', true).map((it) => it.key)).toEqual(['a', 'b', 'c']);
  });

  it('groups by type and falls back to the key inside a type', () => {
    const sorted = sortEntries([...entries, entry('a2', 'y')], 'type', false);
    expect(sorted.map((it) => it.key)).toEqual(['c', 'a', 'a2', 'b']);
  });

  it('leaves the input untouched', () => {
    const original = [...entries];
    sortEntries(entries, 'size', true);
    expect(entries).toEqual(original);
  });
});
