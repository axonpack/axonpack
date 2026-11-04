/**
 * The test behind `storage.redactKeys` and `console.redactKeys`: a string matches a whole key
 * without regard to case, and a RegExp is tested as written.
 */
export function keyMatcher(patterns: readonly (string | RegExp)[] = []): (key: string) => boolean {
  const lowered = patterns.map((pattern) =>
    typeof pattern === 'string' ? pattern.toLowerCase() : pattern
  );
  return (key) =>
    lowered.some((pattern) => {
      if (typeof pattern === 'string') return pattern === key.toLowerCase();
      // A `/g` or `/y` regex carries `lastIndex` between calls, as the storage blacklist found out.
      pattern.lastIndex = 0;
      return pattern.test(key);
    });
}
