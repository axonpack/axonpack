export type SearchModes = {
  matchCase: boolean;
  wholeWord: boolean;
  regex: boolean;
};

export type SearchQuery = { text: string } & SearchModes;

export type MatchRange = [start: number, end: number];

/** `pattern` is null when the query could not be compiled — callers then filter and highlight nothing. */
export type Matcher = {
  pattern: RegExp | null;
  invalid: boolean;
};

export const DEFAULT_SEARCH_MODES: SearchModes = {
  matchCase: false,
  wholeWord: false,
  regex: false,
};

/** Above this, a body renders unhighlighted rather than building a node per match. */
export const MAX_SEARCHABLE_LENGTH = 50_000;

const MAX_MATCHES = 500;

const REGEX_METACHARACTERS = /[.*+?^${}()|[\]\\]/g;

function escapeLiteral(text: string): string {
  return text.replace(REGEX_METACHARACTERS, '\\$&');
}

/**
 * Compile once per query, never per row — the request and console lists both run the result over
 * every visible entry on every keystroke.
 */
export function buildMatcher(query: SearchQuery): Matcher | null {
  if (query.text.length === 0) return null;

  const source = query.regex ? query.text : escapeLiteral(query.text);
  const bounded = query.wholeWord ? `\\b(?:${source})\\b` : source;

  try {
    return { pattern: new RegExp(bounded, query.matchCase ? 'g' : 'gi'), invalid: false };
  } catch {
    return { pattern: null, invalid: true };
  }
}

/** An absent or uncompilable matcher matches everything, so a half-typed regex can't blank the list. */
export function testMatch(text: string, matcher: Matcher | null): boolean {
  if (!matcher?.pattern) return true;
  matcher.pattern.lastIndex = 0;
  return matcher.pattern.test(text);
}

export function findMatches(text: string, matcher: Matcher | null): MatchRange[] {
  if (!matcher?.pattern) return [];
  if (text.length > MAX_SEARCHABLE_LENGTH) return [];

  const { pattern } = matcher;
  pattern.lastIndex = 0;

  const ranges: MatchRange[] = [];
  let match = pattern.exec(text);
  while (match !== null && ranges.length < MAX_MATCHES) {
    if (match[0].length === 0) {
      // A pattern that can match nothing (`a*`) never advances lastIndex on its own.
      pattern.lastIndex += 1;
    } else {
      ranges.push([match.index, match.index + match[0].length]);
    }
    match = pattern.exec(text);
  }

  pattern.lastIndex = 0;
  return ranges;
}

/** Re-bases the ranges overlapping `[start, end)` onto that window, for highlighting one token of a longer string. */
export function clipMatches(ranges: MatchRange[], start: number, end: number): MatchRange[] {
  const clipped: MatchRange[] = [];
  for (const [from, to] of ranges) {
    if (to <= start) continue;
    if (from >= end) break;
    clipped.push([Math.max(from, start) - start, Math.min(to, end) - start]);
  }
  return clipped;
}

export type TextSegment = { text: string; matched: boolean };

export function splitByMatches(text: string, ranges: MatchRange[]): TextSegment[] {
  if (ranges.length === 0) return [{ text, matched: false }];

  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start > cursor) segments.push({ text: text.slice(cursor, start), matched: false });
    segments.push({ text: text.slice(start, end), matched: true });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), matched: false });
  return segments;
}
