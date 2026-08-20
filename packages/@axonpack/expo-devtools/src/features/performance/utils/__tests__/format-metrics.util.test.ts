import { LIGHT_PALETTE as COLORS } from '../../../../core/constants/theme.const';
import { diffMs, formatMs, getLongTaskColor } from '../format-metrics.util';

describe('formatMs', () => {
  it('marks an absent value rather than printing 0', () => {
    expect(formatMs(undefined)).toBe('–');
    expect(formatMs(0)).toBe('0 ms');
  });

  it('never prints a negative zero', () => {
    expect(formatMs(-0.001)).toBe('0 ms');
    expect(formatMs(-0.0001)).toBe('0 ms');
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
  it('escalates long tasks at the perceptible thresholds', () => {
    expect(getLongTaskColor(60, COLORS)).toBe(COLORS.textSecondary);
    expect(getLongTaskColor(100, COLORS)).toBe(COLORS.warning);
    expect(getLongTaskColor(200, COLORS)).toBe(COLORS.error);
  });
});
