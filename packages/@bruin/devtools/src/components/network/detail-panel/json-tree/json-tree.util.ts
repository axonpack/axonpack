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

/** Collapsed-state label, e.g. `{3}` for an object with 3 keys or `[12]` for a 12-item array. */
export function collapsedSummary(value: JsonValue[] | { [key: string]: JsonValue }): string {
  const count = Array.isArray(value) ? value.length : Object.keys(value).length;
  return Array.isArray(value) ? `[${count}]` : `{${count}}`;
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
