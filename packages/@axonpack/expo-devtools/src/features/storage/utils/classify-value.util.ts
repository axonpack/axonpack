import type { Palette } from '../../../core/constants/theme.const';
import type { StorageValueType } from '../services/define-adapter.service';
import { isExpandable, type JsonValue } from '../../../core/utils/json-tree.util';

/**
 * What a row shows, as opposed to `StorageValueType` (what the driver typed the value as). A store
 * holds strings, so most of this is discovered by looking at the text: a value that parses as JSON
 * becomes `'json-object'` / `'json-array'`, `''` becomes `'empty'`, and a key with no value at all
 * becomes `'absent'`.
 *
 * It is what the tab's type filter matches on, and it is classified once at read time.
 */
export type StoredValueKind =
  'json-object' | 'json-array' | 'string' | 'number' | 'boolean' | 'buffer' | 'empty' | 'absent';

/**
 * Classified once at read time, not per render: this parses JSON, and re-running it for a thousand
 * keys on every keystroke of a filter would be the slowest thing in the tab.
 */
export function classifyStoredValue(
  text: string | null,
  valueType: StorageValueType
): StoredValueKind {
  if (valueType === 'buffer') return 'buffer';
  if (valueType === 'number') return 'number';
  if (valueType === 'boolean') return 'boolean';
  if (text === null) return 'absent';
  if (text.length === 0) return 'empty';

  const trimmed = text.trim();
  const first = trimmed[0];
  // Only text that could open a container is worth handing to the parser.
  if (first === '{' || first === '[') {
    const parsed = parseStoredJson(trimmed);
    if (Array.isArray(parsed)) return 'json-array';
    if (parsed !== null && typeof parsed === 'object') return 'json-object';
  }

  return 'string';
}

/** `null` for anything that isn't parseable JSON — including the literal text `null`. */
export function parseStoredJson(text: string): JsonValue | null {
  try {
    return JSON.parse(text) as JsonValue;
  } catch {
    return null;
  }
}

/** Whether the parsed value is worth rendering as a tree rather than as text. */
export function isTreeValue(value: JsonValue | null): boolean {
  return value !== null && isExpandable(value);
}

/** Takes the palette rather than closing over one — a sheet built at module load can't follow a theme. */
export function storedValueColor(COLORS: Palette, kind: StoredValueKind): string {
  switch (kind) {
    case 'json-object':
    case 'json-array':
      return COLORS.accent;
    case 'string':
      return COLORS.jsonString;
    case 'number':
      return COLORS.jsonNumber;
    case 'boolean':
      return COLORS.codeKeyword;
    default:
      return COLORS.textSecondary;
  }
}
