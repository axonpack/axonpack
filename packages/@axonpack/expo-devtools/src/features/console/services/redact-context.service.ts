import type { JsonValue } from '../../../core/utils/json-tree.util';
import { keyMatcher } from '../../../core/utils/key-matcher.util';
import { REDACTED } from '../../network/services/redact-network.service';
import { snapshotValue } from '../utils/format-console-args.util';

let isRedactedKey = keyMatcher();
let redactHook: ((name: string, value: unknown) => unknown) | undefined;

export function configureContextRedaction(options: {
  keys?: readonly (string | RegExp)[];
  redact?: (name: string, value: unknown) => unknown;
}) {
  isRedactedKey = keyMatcher(options.keys);
  redactHook = options.redact;
}

/**
 * Every value the `context` topic hands the CLI comes out of here, before it is printed, cut or
 * logged in the CLI tab. `name` is the exposed name or the dot path that reached the value, and a
 * match on any of its segments hides the whole value. The `>` prompt never comes through here.
 */
export function redactContextValue(name: string, value: unknown): JsonValue {
  const masked = name.split('.').some(isRedactedKey)
    ? REDACTED
    : snapshotValue(value, isRedactedKey);
  if (!redactHook) return masked;
  try {
    return snapshotValue(redactHook(name, masked));
  } catch {
    // Fail closed. Showing the value after the app's own redaction broke could show the very
    // value it was written to hide.
    return REDACTED;
  }
}

/**
 * A called function's throw or rejection, before it becomes the `error:` line. Only `redact` sees
 * the message: `redactKeys` has no key to match in free text.
 */
export function redactContextError(name: string, error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (!redactHook) return new Error(message);
  try {
    return new Error(String(redactHook(name, message)));
  } catch {
    return new Error(REDACTED);
  }
}
