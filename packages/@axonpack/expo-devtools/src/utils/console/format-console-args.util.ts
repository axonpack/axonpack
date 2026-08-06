import type { JsonValue } from '../json-tree.util';

// Deeper than this snapshots as a placeholder. The tree can expand indefinitely, so the cap is
// about bounding the work done on every single log call, not about what's readable.
const MAX_DEPTH = 6;

export type ConsoleArgTone = 'plain' | 'number' | 'boolean' | 'muted';

/**
 * One `console.*` argument, rendered as its own cell. Objects and arrays keep their structure so
 * they go to the shared `JsonTree` instead of being flattened into a string.
 */
export type ConsoleArg =
  | { kind: 'primitive'; text: string; tone: ConsoleArgTone }
  | { kind: 'json'; label?: string; value: JsonValue }
  | { kind: 'error'; text: string; stack?: string };

// Takes the structural shape rather than `Function` — the built-in type is both lint-discouraged
// and awkward to pass a `typeof x === 'function'` narrowing into.
function describeFunction(value: { name?: unknown }): string {
  return typeof value.name === 'string' && value.name.length > 0 ? `ƒ ${value.name}()` : 'ƒ ()';
}

function snapshotObject(
  value: object,
  depth: number,
  seen: Set<object>
): { [key: string]: JsonValue } {
  const result: { [key: string]: JsonValue } = {};
  for (const key of Object.keys(value)) {
    // Reading a property can throw (a getter with a side effect, a proxy trap) — one bad key
    // shouldn't cost us the whole object.
    try {
      result[key] = snapshot((value as Record<string, unknown>)[key], depth + 1, seen);
    } catch {
      result[key] = '[Threw]';
    }
  }
  return result;
}

/**
 * Deep-copies a value into the plain `JsonValue` shape the tree renders. Copied rather than kept by
 * reference on purpose: the ring buffer would otherwise pin 500 live app objects in memory, and
 * expanding a row later would show the object's state *now* rather than when it was logged.
 */
function snapshot(value: unknown, depth: number, seen: Set<object>): JsonValue {
  if (value === null) return null;

  switch (typeof value) {
    case 'undefined':
      return 'undefined';
    case 'string':
    case 'number':
    case 'boolean':
      return value;
    case 'bigint':
      return `${value}n`;
    case 'symbol':
      return String(value);
    case 'function':
      return describeFunction(value);
  }

  const object = value as object;
  if (seen.has(object)) return '[Circular]';
  if (value instanceof Error) return value.stack ?? `${value.name}: ${value.message}`;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof RegExp) return String(value);
  if (depth >= MAX_DEPTH) return Array.isArray(value) ? '[Array]' : '[Object]';

  seen.add(object);
  try {
    if (Array.isArray(value)) return value.map((item) => snapshot(item, depth + 1, seen));
    if (value instanceof Set) {
      return Array.from(value, (item) => snapshot(item, depth + 1, seen));
    }
    if (value instanceof Map) {
      const result: { [key: string]: JsonValue } = {};
      for (const [key, item] of value) result[String(key)] = snapshot(item, depth + 1, seen);
      return result;
    }
    return snapshotObject(object, depth, seen);
  } finally {
    // Deleted rather than left behind so two sibling references to one object aren't mislabelled
    // as circular — only a genuine ancestor cycle is.
    seen.delete(object);
  }
}

function toConsoleArg(value: unknown): ConsoleArg {
  if (value === null) return { kind: 'primitive', text: 'null', tone: 'muted' };

  switch (typeof value) {
    case 'undefined':
      return { kind: 'primitive', text: 'undefined', tone: 'muted' };
    // A top-level string logs bare (`console.log('hi')` → `hi`), matching a browser console.
    case 'string':
      return { kind: 'primitive', text: value, tone: 'plain' };
    case 'number':
      return { kind: 'primitive', text: String(value), tone: 'number' };
    case 'boolean':
      return { kind: 'primitive', text: String(value), tone: 'boolean' };
    case 'bigint':
      return { kind: 'primitive', text: `${value}n`, tone: 'number' };
    case 'symbol':
      return { kind: 'primitive', text: String(value), tone: 'muted' };
    case 'function':
      return { kind: 'primitive', text: describeFunction(value), tone: 'muted' };
  }

  if (value instanceof Error) {
    return { kind: 'error', text: `${value.name}: ${value.message}`, stack: value.stack };
  }
  if (value instanceof Date) return { kind: 'primitive', text: value.toISOString(), tone: 'muted' };
  if (value instanceof RegExp) return { kind: 'primitive', text: String(value), tone: 'muted' };

  const seen = new Set<object>();
  if (value instanceof Map) {
    return { kind: 'json', label: `Map(${value.size})`, value: snapshot(value, 0, seen) };
  }
  if (value instanceof Set) {
    return { kind: 'json', label: `Set(${value.size})`, value: snapshot(value, 0, seen) };
  }
  if (Array.isArray(value)) {
    return { kind: 'json', label: `Array(${value.length})`, value: snapshot(value, 0, seen) };
  }

  const constructorName = (value as object).constructor?.name;
  return {
    kind: 'json',
    label: constructorName && constructorName !== 'Object' ? constructorName : undefined,
    value: snapshot(value, 0, seen),
  };
}

export function toConsoleArgs(args: unknown[]): ConsoleArg[] {
  return args.map(toConsoleArg);
}

/** Flat text behind the row — what the search box matches and what repeat-collapse compares. */
export function getConsoleArgsText(parts: ConsoleArg[]): string {
  return parts
    .map((part) => {
      if (part.kind !== 'json') return part.text;
      // Safe to stringify: `snapshot` already broke every cycle and capped the depth.
      const body = JSON.stringify(part.value) ?? '';
      return part.label ? `${part.label} ${body}` : body;
    })
    .join(' ');
}
