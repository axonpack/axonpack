import { ageAxisLabels } from '../age-labels.util';

describe('ageAxisLabels', () => {
  it('gives three ticks: oldest, midpoint, now', () => {
    expect(ageAxisLabels(120, 1000)).toEqual(['2m ago', '1m', 'now']);
  });

  it('stays in seconds for short spans', () => {
    expect(ageAxisLabels(30, 1000)).toEqual(['30s ago', '15s', 'now']);
  });

  /** A fixed label would claim five minutes while only seconds of data exist. */
  it('describes the samples held, not the buffer capacity', () => {
    expect(ageAxisLabels(20, 500)[0]).toBe('10s ago');
  });

  it('keeps one decimal below ten minutes, so a midpoint is not rounded away', () => {
    expect(ageAxisLabels(600, 500)).toEqual(['5m ago', '2.5m', 'now']);
  });

  it('only the oldest tick carries "ago"', () => {
    const [oldest, middle, latest] = ageAxisLabels(600, 1000);
    expect(oldest).toContain('ago');
    expect(middle).not.toContain('ago');
    expect(latest).toBe('now');
  });

  it('survives an empty series', () => {
    expect(ageAxisLabels(0, 1000)).toEqual(['0s ago', '0s', 'now']);
  });
});
