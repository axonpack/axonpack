import { testMatch, type Matcher } from './text-search.util';

export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export const ARRAY_CHUNK_SIZE = 10;

export function isPlainObject(value: JsonValue): value is { [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isExpandable(
  value: JsonValue
): value is JsonValue[] | { [key: string]: JsonValue } {
  return Array.isArray(value) || isPlainObject(value);
}

export function chunkArrayRange(length: number): [number, number][] {
  const chunks: [number, number][] = [];
  for (let start = 0; start < length; start += ARRAY_CHUNK_SIZE) {
    chunks.push([start, Math.min(start + ARRAY_CHUNK_SIZE, length) - 1]);
  }
  return chunks;
}

const PREVIEW_MAX_ENTRIES = 4;
const PREVIEW_MAX_LENGTH = 80;

function previewOf(value: JsonValue): string {
  if (Array.isArray(value)) return value.length === 0 ? '[]' : '[…]';
  if (isPlainObject(value)) return Object.keys(value).length === 0 ? '{}' : '{…}';
  if (typeof value === 'string') return `"${value}"`;
  return String(value);
}

export function buildPreview(value: JsonValue[] | { [key: string]: JsonValue }): string {
  const isArray = Array.isArray(value);
  let shown;
  if (isArray) {
    shown = value.slice(0, PREVIEW_MAX_ENTRIES).map(previewOf);
  } else {
    const entries = Object.entries(value);
    shown = entries
      .slice(0, PREVIEW_MAX_ENTRIES)
      .map(([key, item]) => `${key}: ${previewOf(item)}`);
  }
  const joinedText = shown.join(', ');
  const suffix = joinedText.length > PREVIEW_MAX_LENGTH ? ', …' : '';
  return isArray
    ? `[${joinedText.slice(0, PREVIEW_MAX_LENGTH)}${suffix}]`
    : `{${joinedText.slice(0, PREVIEW_MAX_LENGTH)}${suffix}}`;
}

export function collectExpandablePaths(path: string, value: JsonValue): string[] {
  if (!isExpandable(value)) return [];
  const paths = [path];
  if (Array.isArray(value) && value.length > ARRAY_CHUNK_SIZE) {
    for (const [start, end] of chunkArrayRange(value.length)) {
      const chunkPath = `${path}#${start}-${end}`;
      paths.push(...collectExpandablePaths(chunkPath, value.slice(start, end + 1)));
    }
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => {
      paths.push(...collectExpandablePaths(`${path}.${index}`, item));
    });
  } else {
    for (const [key, item] of Object.entries(value)) {
      paths.push(...collectExpandablePaths(`${path}.${key}`, item));
    }
  }
  return paths;
}

/** The text a leaf actually renders, so "would expand" and "would highlight" can't disagree. */
function matchesLeaf(value: JsonValue, matcher: Matcher): boolean {
  if (typeof value === 'string') return testMatch(value, matcher);
  if (typeof value === 'number' || typeof value === 'boolean') {
    return testMatch(String(value), matcher);
  }
  return false; // `null` renders unhighlighted
}

function walkForMatches(
  path: string,
  label: string | undefined,
  value: JsonValue,
  matcher: Matcher,
  open: Set<string>,
  indexOffset = 0
): boolean {
  const labelMatched = label !== undefined && testMatch(label, matcher);

  if (!isExpandable(value)) return labelMatched || matchesLeaf(value, matcher);

  let childMatched = false;
  const visit = (childPath: string, childLabel: string, child: JsonValue, offset = 0) => {
    if (walkForMatches(childPath, childLabel, child, matcher, open, offset)) childMatched = true;
  };

  if (Array.isArray(value) && value.length > ARRAY_CHUNK_SIZE) {
    for (const [start, end] of chunkArrayRange(value.length)) {
      visit(`${path}#${start}-${end}`, `[${start} … ${end}]`, value.slice(start, end + 1), start);
    }
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => visit(`${path}.${index}`, String(indexOffset + index), item));
  } else {
    for (const [key, item] of Object.entries(value)) visit(`${path}.${key}`, key, item);
  }

  if (childMatched) open.add(path);
  return labelMatched || childMatched;
}

/**
 * Every node that has to be open for the matches below it to be on screen — nothing else, so a
 * search collapses the branches it didn't hit.
 */
export function collectMatchingPaths(
  path: string,
  value: JsonValue,
  matcher: Matcher,
  rootLabel?: string
): Set<string> {
  const open = new Set<string>();
  walkForMatches(path, rootLabel, value, matcher, open);
  return open;
}

export function formatCopyValue(value: JsonValue): string {
  return JSON.stringify(value, null, 2);
}
