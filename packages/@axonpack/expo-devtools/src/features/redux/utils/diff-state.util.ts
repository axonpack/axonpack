export type StateChange = {
  /** Keys from the root down, array indexes as strings. Empty when the root itself was replaced. */
  path: string[];
  kind: 'added' | 'removed' | 'changed';
  before?: unknown;
  after?: unknown;
};

/**
 * Past this many changes the rest are dropped. An action that rewrites a whole slice would
 * otherwise build a list too long to read and too slow to draw.
 */
export const MAX_CHANGES = 200;

function isContainer(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * What an action changed, as a flat list of leaf changes. Redux state is updated immutably, so a
 * branch whose reference did not change is skipped without being walked, which is what keeps this
 * cheap on a large state.
 */
export function diffState(before: unknown, after: unknown): StateChange[] {
  const changes: StateChange[] = [];

  function walk(a: unknown, b: unknown, path: string[]) {
    if (changes.length >= MAX_CHANGES || Object.is(a, b)) return;
    if (!isContainer(a) || !isContainer(b) || Array.isArray(a) !== Array.isArray(b)) {
      changes.push({ path, kind: 'changed', before: a, after: b });
      return;
    }
    for (const key of Object.keys(a)) {
      if (!(key in b)) changes.push({ path: [...path, key], kind: 'removed', before: a[key] });
      else walk(a[key], b[key], [...path, key]);
    }
    for (const key of Object.keys(b)) {
      if (!(key in a)) changes.push({ path: [...path, key], kind: 'added', after: b[key] });
    }
  }

  walk(before, after, []);
  return changes.slice(0, MAX_CHANGES);
}

/** `todos[2].done`, or `(state)` for the root. */
export function formatStatePath(path: readonly string[]): string {
  if (path.length === 0) return '(state)';
  return path.reduce(
    (text, key, index) =>
      /^\d+$/.test(key) ? `${text}[${key}]` : index === 0 ? key : `${text}.${key}`,
    ''
  );
}

/** One line of a value for a diff row, cut short. */
export function formatDiffValue(value: unknown, max = 80): string {
  let text: string;
  try {
    text = value === undefined ? 'undefined' : (JSON.stringify(value) ?? String(value));
  } catch {
    text = String(value);
  }
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
