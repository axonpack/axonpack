import { getReplContext } from './evaluate-expression.service';

const MAX_OPTIONS = 12;
// How far up the prototype chain member names are collected — enough to reach Array/Object methods
// without dumping every inherited internal.
const MAX_PROTOTYPE_DEPTH = 3;

/** The identifier path being typed, anchored to the end of the input: `foo`, `foo.bar`, `foo.bar.` */
const TRAILING_PATH = /[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\.?$/;
const PLAIN_IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

export type Completion = {
  /** Where in the source the completed token starts, so applying one is a slice-and-append. */
  start: number;
  options: string[];
};

function collectMemberNames(value: unknown): string[] {
  const names = new Set<string>();
  let current: object | null = Object(value);

  for (let depth = 0; current && depth < MAX_PROTOTYPE_DEPTH; depth += 1) {
    for (const name of Object.getOwnPropertyNames(current)) names.add(name);
    current = Object.getPrototypeOf(current);
  }
  return Array.from(names);
}

/**
 * Walks a dotted path by reading properties only — never calling anything — so completing
 * `foo.bar.` can't run the app's functions. A getter along the path does still run, which is the
 * same bargain a browser console makes for member completion.
 */
function resolvePath(segments: string[]): unknown {
  const context = getReplContext();
  const root = segments[0];
  let current: unknown =
    root in context ? context[root] : (globalThis as Record<string, unknown>)[root];

  for (let index = 1; index < segments.length; index += 1) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[segments[index]];
  }
  return current;
}

export function getCompletions(source: string): Completion | null {
  const match = source.match(TRAILING_PATH);
  if (!match || match.index === undefined) return null;

  const segments = match[0].split('.');
  // Empty when the token ends in a dot — that's the "list every member" case.
  const partial = segments.pop() ?? '';
  const base = segments;

  // A bare, empty token would mean suggesting every global before a single character is typed.
  if (base.length === 0 && partial.length === 0) return null;

  let names: string[];
  try {
    if (base.length === 0) {
      names = [
        ...Object.keys(getReplContext()),
        ...Object.getOwnPropertyNames(globalThis as object),
      ];
    } else {
      const target = resolvePath(base);
      if (target === null || target === undefined) return null;
      names = collectMemberNames(target);
    }
  } catch {
    // A throwing getter or an exotic host object — no suggestions rather than a broken prompt.
    return null;
  }

  const options = Array.from(new Set(names))
    .filter((name) => name !== partial && name.startsWith(partial) && PLAIN_IDENTIFIER.test(name))
    .sort()
    .slice(0, MAX_OPTIONS);

  if (options.length === 0) return null;
  return { start: match.index + match[0].length - partial.length, options };
}
