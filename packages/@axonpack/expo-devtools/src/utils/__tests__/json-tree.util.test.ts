import { collectMatchingPaths, type JsonValue } from '../json-tree.util';
import { buildMatcher, DEFAULT_SEARCH_MODES } from '../text-search.util';

const ROOT = '$';

function matcherFor(text: string) {
  return buildMatcher({ text, ...DEFAULT_SEARCH_MODES })!;
}

function pathsFor(value: JsonValue, query: string, rootLabel?: string): string[] {
  return [...collectMatchingPaths(ROOT, value, matcherFor(query), rootLabel)].sort();
}

describe('collectMatchingPaths', () => {
  it('opens only the branch holding the match', () => {
    const value = { a: { b: 'needle' }, c: { d: 'hay' } };
    expect(pathsFor(value, 'needle')).toEqual(['$', '$.a']);
  });

  it('opens the ancestors of a matching key', () => {
    const value = { outer: { needle: 'anything' } };
    expect(pathsFor(value, 'needle')).toEqual(['$', '$.outer']);
  });

  it('opens nothing when nothing matches', () => {
    expect(pathsFor({ a: { b: 'hay' } }, 'needle')).toEqual([]);
  });

  it('matches numbers and booleans by the text they render as', () => {
    expect(pathsFor({ a: { b: 42 } }, '42')).toEqual(['$', '$.a']);
    expect(pathsFor({ a: { b: true } }, 'true')).toEqual(['$', '$.a']);
  });

  it('leaves null alone, since it renders unhighlighted', () => {
    expect(pathsFor({ a: { b: null } }, 'null')).toEqual([]);
  });

  it('opens the chunk a matching array item falls in, and no other', () => {
    const value = Array.from({ length: 25 }, (unused, index) => index);
    expect(pathsFor(value, '23')).toEqual(['$', '$#20-24']);
  });

  it('opens the path through a chunk to a nested match', () => {
    const value = Array.from({ length: 12 }, (unused, index) => ({ id: `item-${index}` }));
    // Item 11 sits at local index 1 of the second chunk.
    expect(pathsFor(value, 'item-11')).toEqual(['$', '$#10-11', '$#10-11.1']);
  });

  it('does not open anything for a match on the root label alone', () => {
    expect(pathsFor({ a: 'hay' }, 'response', 'response')).toEqual([]);
  });
});
