import type { JsonValue } from '../../../core/utils/json-tree.util';
import { REDACTED } from '../../network/services/redact-network.service';

const MAX_DEPTH = 6;

export type ConsoleArgTone = 'plain' | 'number' | 'boolean' | 'muted';

export type ConsoleArg =
  | { kind: 'primitive'; text: string; tone: ConsoleArgTone }
  | { kind: 'json'; label?: string; value: JsonValue }
  | { kind: 'error'; text: string; stack?: string };

function describeFunction(value: { name?: unknown }): string {
  return typeof value.name === 'string' && value.name.length > 0 ? `ƒ ${value.name}()` : 'ƒ ()';
}

/** A key it says yes to keeps its place, with `[redacted]` and its value never read. */
type HideKey = (key: string) => boolean;

function snapshotObject(
  value: object,
  depth: number,
  seen: Set<object>,
  hide?: HideKey
): { [key: string]: JsonValue } {
  const result: { [key: string]: JsonValue } = {};
  for (const key of Object.keys(value)) {
    if (hide?.(key)) {
      result[key] = REDACTED;
      continue;
    }
    try {
      result[key] = snapshot((value as Record<string, unknown>)[key], depth + 1, seen, hide);
    } catch {
      result[key] = '[Threw]';
    }
  }
  return result;
}

function snapshot(value: unknown, depth: number, seen: Set<object>, hide?: HideKey): JsonValue {
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
    if (Array.isArray(value)) return value.map((item) => snapshot(item, depth + 1, seen, hide));
    if (value instanceof Set) {
      return Array.from(value, (item) => snapshot(item, depth + 1, seen, hide));
    }
    if (value instanceof Map) {
      const result: { [key: string]: JsonValue } = {};
      for (const [key, item] of value) {
        const name = String(key);
        result[name] = hide?.(name) ? REDACTED : snapshot(item, depth + 1, seen, hide);
      }
      return result;
    }
    return snapshotObject(object, depth, seen, hide);
  } finally {
    seen.delete(object);
  }
}

/**
 * A value as a console row holds it: functions, cycles and errors become text, so JSON can carry it.
 * `hide` redacts an object's or a Map's key at any depth.
 */
export function snapshotValue(value: unknown, hide?: HideKey): JsonValue {
  return snapshot(value, 0, new Set(), hide);
}

function toConsoleArg(value: unknown): ConsoleArg {
  if (value === null) return { kind: 'primitive', text: 'null', tone: 'muted' };

  switch (typeof value) {
    case 'undefined':
      return { kind: 'primitive', text: 'undefined', tone: 'muted' };

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

export function getConsoleArgsText(parts: ConsoleArg[]): string {
  return parts
    .map((part) => {
      if (part.kind !== 'json') return part.text;

      const body = JSON.stringify(part.value) ?? '';
      return part.label ? `${part.label} ${body}` : body;
    })
    .join(' ');
}
