import { findModule, listModules } from '../utils/metro-modules.util';
import { normalizeExpressionInput } from '../utils/normalize-expression.util';

let replEnabled = false;
let userContext: Record<string, unknown> = {};
/** Who exposed each name in `userContext`: `app`, or a support's id. */
let sourceOf: Record<string, string> = {};

/** The app's `console.context` wins a name clash with a support's. */
export function configureRepl(
  enabled: boolean,
  appContext: Record<string, unknown> = {},
  supports: readonly { id: string; context?: Record<string, unknown> }[] = []
) {
  replEnabled = enabled;
  userContext = {};
  sourceOf = {};
  for (const { id, context = {} } of [...supports, { id: 'app', context: appContext }]) {
    for (const name of Object.keys(context)) {
      userContext[name] = context[name];
      sourceOf[name] = id;
    }
  }
}

export function isReplEnabled(): boolean {
  return replEnabled;
}

export function getReplContext(): Record<string, unknown> {
  return { $m: findModule, $modules: listModules, ...userContext };
}

/**
 * What the app and its supports exposed to the prompt, without the prompt's own `$m` and
 * `$modules`. The CLI's `context` topic reads this, so it always has the prompt's names.
 */
export function getExposedContext(): { name: string; value: unknown; source: string }[] {
  return Object.keys(userContext).map((name) => ({
    name,
    value: userContext[name],
    source: sourceOf[name],
  }));
}

export function evaluateExpression(rawSource: string): unknown {
  const source = normalizeExpressionInput(rawSource);
  const context = getReplContext();
  const names = Object.keys(context);
  const values = names.map((name) => context[name]);

  let run: (...args: unknown[]) => unknown;
  try {
    // eslint-disable-next-line no-new-func
    run = new Function(...names, `return (\n${source}\n);`) as (...args: unknown[]) => unknown;
  } catch {
    // eslint-disable-next-line no-new-func
    run = new Function(...names, source) as (...args: unknown[]) => unknown;
  }

  return run(...values);
}
