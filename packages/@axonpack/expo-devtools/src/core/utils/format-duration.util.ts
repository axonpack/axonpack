/**
 * How long something took, in the unit that reads fastest.
 *
 * Seconds past 100 ms, because a request that took `1034.52 ms` is a second and a bit, and nobody
 * reads it as that without counting the digits. Below 100 ms the millisecond is the natural unit and
 * the conversion would only produce leading zeros — `0.089 s` hides what `89 ms` says plainly.
 *
 * Sub-millisecond phases keep three decimals: the platform reports a send phase as
 * `0.0890493392944336`, which is precision nobody needs and a column nothing fits. A phase too small
 * to survive that rounding says so rather than reading as one that took no time at all.
 */
export function formatDuration(ms: number | undefined): string {
  if (ms === undefined || !Number.isFinite(ms)) return '–';
  // A duration below zero is a clock artifact — two markers read against a clock that moved — and the
  // panel says nothing happened rather than printing a negative length of time.
  if (ms <= 0) return '0 ms';

  if (ms >= MILLISECOND_CEILING) return `${round(ms / 1000, 2)} s`;
  // Three decimals under a millisecond, one above it: `0.089 ms` is the whole of a send phase, while
  // the third decimal of `47.612 ms` is noise in a number nobody reads that closely.
  if (ms >= 1) return `${round(ms, 1)} ms`;

  const rounded = round(ms, 3);
  return rounded === 0 ? '<0.001 ms' : `${rounded} ms`;
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/** Where milliseconds stop being the clearer unit. */
const MILLISECOND_CEILING = 100;
