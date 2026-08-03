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

/** Chrome groups long arrays into ranges (e.g. `[0 … 99]`) instead of one giant flat list. */
export function chunkArrayRange(length: number): [number, number][] {
  const chunks: [number, number][] = [];
  for (let start = 0; start < length; start += ARRAY_CHUNK_SIZE) {
    chunks.push([start, Math.min(start + ARRAY_CHUNK_SIZE, length) - 1]);
  }
  return chunks;
}

// Chrome shows this many entries inline before truncating with `,…` — matches its own preview.
const PREVIEW_MAX_ENTRIES = 4;
const PREVIEW_MAX_LENGTH = 80;

function previewOf(value: JsonValue): string {
  if (Array.isArray(value)) return value.length === 0 ? '[]' : '[…]';
  if (isPlainObject(value)) return Object.keys(value).length === 0 ? '{}' : '{…}';
  if (typeof value === 'string') return `"${value}"`;
  return String(value);
}

/**
 * Chrome's inline object/array preview — shown on the header line whether collapsed or
 * expanded, in the object's original (unsorted) key order, truncated to a handful of entries.
 * Nested objects/arrays only get a shallow `{…}`/`[…]` placeholder, not a further-nested preview.
 */
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

/** Every descendant path under `path` that's itself expandable (object/array/chunk group). */
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

export function formatCopyValue(value: JsonValue): string {
  return JSON.stringify(value, null, 2);
}
