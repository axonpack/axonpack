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

/** An empty container gets no toggle and no expand menu item: opening it would reveal nothing. */
export function hasChildren(value: JsonValue): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (isPlainObject(value)) return Object.keys(value).length > 0;
  return false;
}

/** Buckets of `[0 … 9]`, so a 10k-element array doesn't render 10k rows to reach one of them. */
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

/** Paths are the identity for expansion state, so recursive expand is a set union. */
export function collectExpandablePaths(path: string, value: JsonValue): string[] {
  if (!isExpandable(value)) return [];
  const paths = [path];
  if (Array.isArray(value) && value.length > ARRAY_CHUNK_SIZE) {
    for (const [start, end] of chunkArrayRange(value.length)) {
      paths.push(...collectExpandablePaths(`${path}#${start}-${end}`, value.slice(start, end + 1)));
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

export function formatCopyValue(value: JsonValue): string {
  return JSON.stringify(value, null, 2);
}
