// Beyond this, nested objects render as `{…}` instead of expanding — a logged store or navigation
// state is deep enough that a full walk produces a wall of text nobody reads on a phone.
const MAX_DEPTH = 4;

function getConstructorPrefix(value: object): string {
  const name = value.constructor?.name;
  return name && name !== 'Object' ? `${name} ` : '';
}

function formatValue(value: unknown, depth: number, seen: Set<object>): string {
  if (value === null) return 'null';

  switch (typeof value) {
    case 'undefined':
      return 'undefined';
    // A top-level string logs bare (`console.log('hi')` → `hi`); nested ones are quoted so an
    // array of strings reads as data rather than as one run-on sentence.
    case 'string':
      return depth === 0 ? value : JSON.stringify(value);
    case 'number':
    case 'boolean':
      return String(value);
    case 'bigint':
      return `${value}n`;
    case 'symbol':
      return String(value);
    case 'function':
      return value.name ? `ƒ ${value.name}()` : 'ƒ ()';
  }

  const object = value as object;
  if (seen.has(object)) return '[Circular]';
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof RegExp) return String(value);
  if (depth >= MAX_DEPTH) return Array.isArray(value) ? '[…]' : '{…}';

  seen.add(object);
  try {
    if (Array.isArray(value)) {
      return `[${value.map((item) => formatValue(item, depth + 1, seen)).join(', ')}]`;
    }
    if (value instanceof Map) {
      const pairs = Array.from(value, ([key, item]) => {
        return `${formatValue(key, depth + 1, seen)} => ${formatValue(item, depth + 1, seen)}`;
      });
      return `Map(${value.size}) {${pairs.join(', ')}}`;
    }
    if (value instanceof Set) {
      const items = Array.from(value, (item) => formatValue(item, depth + 1, seen));
      return `Set(${value.size}) {${items.join(', ')}}`;
    }

    const entries = Object.entries(object);
    const prefix = getConstructorPrefix(object);
    if (entries.length === 0) return `${prefix}{}`;
    const body = entries
      .map(([key, item]) => `${key}: ${formatValue(item, depth + 1, seen)}`)
      .join(', ');
    return `${prefix}{ ${body} }`;
  } finally {
    // Deleted rather than left in the set so two sibling references to the same object aren't
    // mislabelled as circular — only a genuine ancestor cycle is.
    seen.delete(object);
  }
}

/** Serializes every argument of one `console.*` call into the single line shown in the log row. */
export function formatConsoleArgs(args: unknown[]): string {
  return args.map((arg) => formatValue(arg, 0, new Set())).join(' ');
}
