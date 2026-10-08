import type { Palette } from '../../../core/constants/theme.const';
import { formatDuration } from '../../../core/utils/format-duration.util';

/** One rule for every duration the panel shows, so the tabs agree with each other. */
export const formatMs = formatDuration;

export function getLongTaskColor(duration: number, COLORS: Palette): string {
  if (duration >= 200) return COLORS.error;
  if (duration >= 100) return COLORS.warning;
  return COLORS.textSecondary;
}

export function diffMs(from: number | undefined, to: number | undefined): number | undefined {
  if (from === undefined || to === undefined) return undefined;
  return to - from;
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/**
 * One CPU line's latest reading. Before the first sample it is a dash; after it, a thread that could
 * not be read says so, because charting it as 0 would claim the thread was idle.
 */
export function formatCpuReading(sampled: boolean, value: number | undefined): string {
  if (value !== undefined) return formatPercent(value);
  return sampled ? 'not measured' : '–';
}
