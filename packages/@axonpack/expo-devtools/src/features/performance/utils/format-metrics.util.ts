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
