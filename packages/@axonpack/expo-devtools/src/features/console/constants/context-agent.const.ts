import type { AgentTopic } from '../../../agent/constants/agent-topics.const';
import { printValue } from '../../../agent/utils/run-query.util';
import type { JsonValue } from '../../../core/utils/json-tree.util';
import { getExposedContext, isReplEnabled } from '../services/evaluate-expression.service';
import { redactContextError, redactContextValue } from '../services/redact-context.service';

type ContextRow = {
  /** The name, or the dot path `get` asked for. */
  name: string;
  type: 'function' | 'object' | 'value';
  /** `app` for `console.context`, or the id of the support that added it. */
  source: string;
  /**
   * As a console row holds it, after `console.redactKeys` and `console.redact`, so `--grep` and
   * `get` never walk a cycle, call a getter twice or see what the app redacted.
   */
  value: JsonValue;
};

const PREVIEW_CHARS = 80;
// Each is a step towards `Function`, which would turn `call` into a free eval.
const UNREACHABLE = new Set(['constructor', 'prototype', '__proto__']);

const typeOf = (value: unknown): ContextRow['type'] =>
  typeof value === 'function'
    ? 'function'
    : typeof value === 'object' && value !== null
      ? 'object'
      : 'value';

const toRow = (name: string, value: unknown, source: string): ContextRow => ({
  name,
  type: typeOf(value),
  source,
  value: redactContextValue(name, value),
});

/**
 * `preview.status` is `status` read off the exposed `preview`, which is then `this` for a call. Only
 * the names the app and its supports exposed are roots, never a global.
 */
function resolve(path: string): { value: unknown; owner: unknown; source: string } {
  const [root, ...keys] = path.split('.');
  const entry = getExposedContext().find((each) => each.name === root);
  if (!entry) throw new Error(`no context name "${root}". devtools context lists them`);
  let owner: unknown;
  let value = entry.value;
  let reached = root;
  for (const key of keys) {
    if (UNREACHABLE.has(key)) throw new Error(`${path}: the CLI doesn't reach ${key}`);
    if (value == null || !(key in Object(value))) throw new Error(`no "${key}" in ${reached}`);
    owner = value;
    value = (value as Record<string, unknown>)[key];
    reached += `.${key}`;
  }
  return { value, owner, source: entry.source };
}

/** A JSON array is the arguments, and any other JSON value is the one argument. */
function parseArgs(json: string | undefined): unknown[] {
  if (json === undefined) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error(
      `the args must be JSON, such as '["a", 1]' for two or '"a"' for one, and ${json} isn't`
    );
  }
  return Array.isArray(parsed) ? parsed : [parsed];
}

const returned = (name: string, value: unknown) =>
  `# context · ${name} returned\n${value === undefined ? 'undefined' : printValue(redactContextValue(name, value), false)}`;

export const CONTEXT_AGENT: AgentTopic<ContextRow> = {
  name: 'context',
  about:
    "the names the Console tab's > prompt reaches, from console.context and the supports. call <name> [args as JSON] --yes runs a function",
  rows: () => getExposedContext().map(({ name, value, source }) => toRow(name, value, source)),
  enabled: isReplEnabled,
  off: 'console.repl is off',
  find: (path) => {
    const { value, source } = resolve(path);
    return toRow(path, value, source);
  },
  fields: {
    id: (r) => r.name,
    t: () => undefined,
    name: (r) => r.name,
    type: (r) => r.type,
    source: (r) => r.source,
    preview: (r) => {
      const text = typeof r.value === 'string' ? r.value : JSON.stringify(r.value);
      return text.length > PREVIEW_CHARS ? `${text.slice(0, PREVIEW_CHARS)}...` : text;
    },
  },
  show: ['name', 'type', 'source', 'preview'],
  detail: (r) => r.value,
  empty: () => 'nothing exposed: add names to console.context in the devtools config',
  actions: {
    call: {
      usage: '<name> [args as JSON] --yes',
      args: [1, 2],
      options: ['yes'],
      run: ([name, json], options) => {
        const { value, owner } = resolve(name);
        if (typeof value !== 'function') {
          throw new Error(
            `${name} is ${typeOf(value) === 'object' ? 'an object' : 'a value'}, not a function. devtools get context ${name} reads it`
          );
        }
        const args = parseArgs(json);
        if (options.yes !== true)
          throw new Error('call runs a function in the app, so it needs --yes');
        let result: unknown;
        try {
          result = value.apply(owner, args);
        } catch (error) {
          throw redactContextError(name, error);
        }
        if (typeof (result as { then?: unknown } | null)?.then !== 'function') {
          return returned(name, result);
        }
        return {
          waitingFor: `running ${name}`,
          answer: Promise.resolve(result).then(
            (settled) => returned(name, settled),
            (error) => {
              throw redactContextError(name, error);
            }
          ),
        };
      },
    },
  },
};
