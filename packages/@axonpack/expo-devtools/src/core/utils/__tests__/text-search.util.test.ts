import {
  buildMatcher,
  clipMatches,
  DEFAULT_SEARCH_MODES,
  findMatches,
  MAX_SEARCHABLE_LENGTH,
  splitByMatches,
  testMatch,
  type SearchModes,
} from '../text-search.util';

function matcherFor(text: string, modes: Partial<SearchModes> = {}) {
  return buildMatcher({ text, ...DEFAULT_SEARCH_MODES, ...modes });
}

describe('buildMatcher', () => {
  it('returns null for an empty query', () => {
    expect(matcherFor('')).toBeNull();
  });

  it('treats regex metacharacters literally when regex mode is off', () => {
    const matcher = matcherFor('a.c');
    expect(testMatch('a.c', matcher)).toBe(true);
    expect(testMatch('abc', matcher)).toBe(false);
  });

  it('compiles the query as a pattern when regex mode is on', () => {
    const matcher = matcherFor('a.c', { regex: true });
    expect(testMatch('abc', matcher)).toBe(true);
  });

  it('is case insensitive by default and exact with matchCase', () => {
    expect(testMatch('HELLO', matcherFor('hello'))).toBe(true);
    expect(testMatch('HELLO', matcherFor('hello', { matchCase: true }))).toBe(false);
  });

  it('bounds the query to word edges with wholeWord', () => {
    const matcher = matcherFor('api', { wholeWord: true });
    expect(testMatch('https://x.dev/api/v2', matcher)).toBe(true);
    expect(testMatch('https://x.dev/apiv2', matcher)).toBe(false);
  });

  it('applies wholeWord to the whole alternation, not just its last branch', () => {
    const matcher = matcherFor('api|cdn', { wholeWord: true, regex: true });
    expect(testMatch('the api call', matcher)).toBe(true);
    expect(testMatch('rapid', matcher)).toBe(false);
  });

  it('reports an uncompilable pattern instead of throwing', () => {
    const matcher = matcherFor('(unclosed', { regex: true });
    expect(matcher?.invalid).toBe(true);
    expect(matcher?.pattern).toBeNull();
  });
});

describe('testMatch', () => {
  it('matches everything when there is no matcher', () => {
    expect(testMatch('anything', null)).toBe(true);
  });

  it('matches everything while the pattern is invalid, so the list cannot blank out', () => {
    expect(testMatch('anything', matcherFor('(', { regex: true }))).toBe(true);
  });

  it('is not thrown off by the shared regex keeping its lastIndex', () => {
    const matcher = matcherFor('a');
    expect(testMatch('aaa', matcher)).toBe(true);
    expect(testMatch('aaa', matcher)).toBe(true);
    expect(testMatch('aaa', matcher)).toBe(true);
  });
});

describe('findMatches', () => {
  it('returns every occurrence', () => {
    expect(findMatches('a-a-a', matcherFor('a'))).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
    ]);
  });

  it('returns nothing without a matcher', () => {
    expect(findMatches('abc', null)).toEqual([]);
  });

  it('terminates on a pattern that can match nothing', () => {
    expect(findMatches('abc', matcherFor('x*', { regex: true }))).toEqual([]);
  });

  it('skips bodies too large to highlight', () => {
    const body = 'a'.repeat(MAX_SEARCHABLE_LENGTH + 1);
    expect(findMatches(body, matcherFor('a'))).toEqual([]);
  });
});

describe('clipMatches', () => {
  it('re-bases the ranges overlapping the window', () => {
    const ranges = findMatches('one two three', matcherFor('t', { matchCase: true }));
    expect(ranges).toEqual([
      [4, 5],
      [8, 9],
    ]);
    expect(clipMatches(ranges, 4, 9)).toEqual([
      [0, 1],
      [4, 5],
    ]);
  });

  it('keeps the overlapping part of a range that straddles the window', () => {
    expect(clipMatches([[2, 8]], 4, 6)).toEqual([[0, 2]]);
  });

  it('drops ranges outside the window', () => {
    expect(clipMatches([[0, 2]], 4, 6)).toEqual([]);
  });
});

describe('splitByMatches', () => {
  it('returns one unmatched segment when nothing matched', () => {
    expect(splitByMatches('abc', [])).toEqual([{ text: 'abc', matched: false }]);
  });

  it('splits around the matched ranges', () => {
    expect(
      splitByMatches('a-b', [
        [0, 1],
        [2, 3],
      ])
    ).toEqual([
      { text: 'a', matched: true },
      { text: '-', matched: false },
      { text: 'b', matched: true },
    ]);
  });
});
