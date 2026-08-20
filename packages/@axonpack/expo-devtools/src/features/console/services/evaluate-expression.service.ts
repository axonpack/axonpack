import { findModule, listModules } from '../utils/metro-modules.util';
import { normalizeExpressionInput } from '../utils/normalize-expression.util';

let replEnabled = false;
let userContext: Record<string, unknown> = {};

export function configureRepl(enabled: boolean, context?: Record<string, unknown>) {
  replEnabled = enabled;
  userContext = context ?? {};
}

export function isReplEnabled(): boolean {
  return replEnabled;
}

export function getReplContext(): Record<string, unknown> {
  return { $m: findModule, $modules: listModules, ...userContext };
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
