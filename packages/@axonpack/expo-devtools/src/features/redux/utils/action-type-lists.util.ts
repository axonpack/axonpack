/** An action type to match: a string is the exact type, a RegExp is tested against it. */
export type ActionTypeMatcher = string | RegExp;

function matches(type: string, matcher: ActionTypeMatcher): boolean {
  return typeof matcher === 'string' ? matcher === type : matcher.test(type);
}

/**
 * An empty allow list lets every type through. The deny list wins over the allow list, so a type
 * allowed by a broad pattern can still be dropped by name.
 */
export function isActionTypeRecorded(
  type: string,
  allow: readonly ActionTypeMatcher[],
  deny: readonly ActionTypeMatcher[]
): boolean {
  if (deny.some((matcher) => matches(type, matcher))) return false;
  return allow.length === 0 || allow.some((matcher) => matches(type, matcher));
}

export function formatActionTypeMatcher(matcher: ActionTypeMatcher): string {
  return typeof matcher === 'string' ? matcher : String(matcher);
}
