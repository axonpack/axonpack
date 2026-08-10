import { COLORS } from '../../../constants/colors.const';
import { diffMs, formatMs, getFpsColor, getLongTaskColor } from '../format-metrics.util';

describe('formatMs', () => {
  it('marks an absent value rather than printing 0', () => {
    expect(formatMs(undefined)).toBe('–');
    expect(formatMs(0)).toBe('0.00 ms');
  });

  it('keeps sub-millisecond precision but rounds past 1ms', () => {
    expect(formatMs(0.4)).toBe('0.40 ms');
    expect(formatMs(47.6)).toBe('48 ms');
  });

  it('switches to seconds at 1000ms', () => {
    expect(formatMs(999)).toBe('999 ms');
    expect(formatMs(1000)).toBe('1.00 s');
    expect(formatMs(2350)).toBe('2.35 s');
  });
});

describe('diffMs', () => {
  // Startup markers are individually nullable, so a missing one must not read as a zero-length phase.
  it('returns undefined when either end is missing', () => {
    expect(diffMs(undefined, 100)).toBeUndefined();
    expect(diffMs(100, undefined)).toBeUndefined();
    expect(diffMs(undefined, undefined)).toBeUndefined();
  });

  it('preserves a genuine zero-length span', () => {
    expect(diffMs(50, 50)).toBe(0);
  });

  it('subtracts in timeline order', () => {
    expect(diffMs(10, 35)).toBe(25);
  });
});

describe('threshold colors', () => {
  it('grades fps against a 60fps target', () => {
    expect(getFpsColor(60)).toBe(COLORS.success);
    expect(getFpsColor(50)).toBe(COLORS.success);
    expect(getFpsColor(49)).toBe(COLORS.warning);
    expect(getFpsColor(30)).toBe(COLORS.warning);
    expect(getFpsColor(29)).toBe(COLORS.error);
  });

  it('is muted for an unknown fps rather than alarming', () => {
    expect(getFpsColor(undefined)).toBe(COLORS.textSecondary);
  });

  it('escalates long tasks at the perceptible thresholds', () => {
    expect(getLongTaskColor(60)).toBe(COLORS.textSecondary);
    expect(getLongTaskColor(100)).toBe(COLORS.warning);
    expect(getLongTaskColor(200)).toBe(COLORS.error);
  });
});
