import { COLORS } from '../../constants/colors.const';

export function formatMs(value: number | undefined): string {
  if (value === undefined) return '–';
  // Two markers a hair apart produced "-0.00 ms", which reads as negative time rather than "the same
  // instant". Anything inside a hundredth of a millisecond is that.
  if (Math.abs(value) < 0.01) return '0 ms';
  if (value < 1) return `${value.toFixed(2)} ms`;
  if (value < 1000) return `${Math.round(value)} ms`;
  return `${(value / 1000).toFixed(2)} s`;
}

/** 60 is the assumed target: anything at or above reads healthy, a third below it reads broken. */
export function getFpsColor(fps: number | undefined): string {
  if (fps === undefined) return COLORS.textSecondary;
  if (fps >= 50) return COLORS.success;
  if (fps >= 30) return COLORS.warning;
  return COLORS.error;
}

/** Chrome treats anything over 50ms as a long task; past ~200ms a user perceives it as a freeze. */
export function getLongTaskColor(duration: number): string {
  if (duration >= 200) return COLORS.error;
  if (duration >= 100) return COLORS.warning;
  return COLORS.textSecondary;
}

/**
 * Startup is reported as absolute timestamps on the performance timeline, so a phase duration is the
 * gap between two of them — and any of them can be missing, which has to stay distinguishable from
 * a real zero.
 */
export function diffMs(from: number | undefined, to: number | undefined): number | undefined {
  if (from === undefined || to === undefined) return undefined;
  return to - from;
}
