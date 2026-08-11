/**
 * Collapses a long series into `buckets` values by taking the **minimum** of each bucket.
 *
 * Minimum, not average, because this exists for frame rates: a half-second dip to 12fps is the thing you
 * are looking for, and averaging it against nine healthy samples hides it completely. A chart that
 * smooths away the only interesting event is worse than no chart.
 */
export function downsampleMin(values: number[], buckets: number): number[] {
  if (buckets <= 0 || values.length === 0) return [];
  if (values.length <= buckets) return values;

  const size = values.length / buckets;
  const result: number[] = [];
  for (let index = 0; index < buckets; index += 1) {
    const start = Math.floor(index * size);
    const end = Math.max(start + 1, Math.floor((index + 1) * size));
    let lowest = values[start];
    for (let cursor = start + 1; cursor < end && cursor < values.length; cursor += 1) {
      if (values[cursor] < lowest) lowest = values[cursor];
    }
    result.push(lowest);
  }
  return result;
}
