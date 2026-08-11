/**
 * The unit comes from the whole span, not from each tick. Deciding per tick produced "2m ago · 60s · now"
 * — the same duration written two ways inside one axis, which makes the reader convert as they scan.
 */
function formatAge(seconds: number, useMinutes: boolean, withSuffix: boolean): string {
  let text: string;
  if (useMinutes) {
    const minutes = seconds / 60;
    // One decimal below ten minutes, so a 2.5 minute midpoint isn't rounded away to "3m".
    text = minutes < 10 ? `${Math.round(minutes * 10) / 10}m` : `${Math.round(minutes)}m`;
  } else {
    text = `${seconds}s`;
  }
  return withSuffix ? `${text} ago` : text;
}

/**
 * Three x-axis ticks — oldest, midpoint, now — derived from how many samples are actually held rather
 * than from the buffer's capacity. A chart holding thirty seconds of data must not label its left edge
 * "5m ago" just because it could eventually reach back that far.
 *
 * Only the oldest tick carries "ago": repeating it on the midpoint reads as noise once the row is scanned
 * left-to-right, and "now" already fixes the direction.
 */
export function ageAxisLabels(sampleCount: number, intervalMs: number): string[] {
  const seconds = Math.round((sampleCount * intervalMs) / 1000);
  const useMinutes = seconds >= 90;
  return [
    formatAge(seconds, useMinutes, true),
    formatAge(Math.round(seconds / 2), useMinutes, false),
    'now',
  ];
}
