import { findModule, listModules } from '../../utils/console/metro-modules.util';
import { normalizeExpressionInput } from '../../utils/console/normalize-expression.util';

let replEnabled = false;
let userContext: Record<string, unknown> = {};

/** Set by `createDevtoolsClient(...).init()`. The prompt stays hidden until this turns it on. */
export function configureRepl(enabled: boolean, context?: Record<string, unknown>) {
  replEnabled = enabled;
  userContext = context ?? {};
}

export function isReplEnabled(): boolean {
  return replEnabled;
}

/** The injected names an expression can use — the built-in helpers plus whatever the app passed. */
export function getReplContext(): Record<string, unknown> {
  return { $m: findModule, $modules: listModules, ...userContext };
}

/**
 * Runs a typed expression. Hermes drops _local mode_ `eval()` but keeps `new Function`, so the code
 * compiles against globals plus the names below, passed in as parameters — the only way to make an
 * app's own objects resolvable, since Metro's module closures aren't reachable from any scope.
 *
 * Throws whatever the expression throws; the caller renders it as the result.
 */
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
