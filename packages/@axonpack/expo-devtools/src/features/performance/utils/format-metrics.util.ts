import type { Palette } from '../../../core/constants/theme.const';

export function formatMs(value: number | undefined): string {
  if (value === undefined) return '–';

  if (Math.abs(value) < 0.01) return '0 ms';
  if (value < 1) return `${value.toFixed(2)} ms`;
  if (value < 1000) return `${Math.round(value)} ms`;
  return `${(value / 1000).toFixed(2)} s`;
}

export function getLongTaskColor(duration: number, COLORS: Palette): string {
  if (duration >= 200) return COLORS.error;
  if (duration >= 100) return COLORS.warning;
  return COLORS.textSecondary;
}

export function diffMs(from: number | undefined, to: number | undefined): number | undefined {
  if (from === undefined || to === undefined) return undefined;
  return to - from;
}
