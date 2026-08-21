/**
 * A download reports progress per chunk, which for a large body is hundreds of events. Each one
 * would write to the store and re-render the list, so readings are dropped to one per interval —
 * the last one is always sent, so the final figure is exact rather than merely recent.
 */
export function createProgressThrottle(minIntervalMs = 100) {
  let lastAt = 0;

  return function shouldEmit(now: number, force = false): boolean {
    if (force || now - lastAt >= minIntervalMs) {
      lastAt = now;
      return true;
    }
    return false;
  };
}
