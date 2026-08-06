import type { MaterialIconName } from '../../components/ui/icon-button.ui';
import type { ConsoleLogLevel } from '../../stores/console/console-log.store';
import { COLORS } from '../colors.const';

/** Filter-chip order — severity ascending, matching a browser console's level dropdown. */
export const CONSOLE_LEVELS: ConsoleLogLevel[] = ['log', 'info', 'warn', 'error', 'debug'];

export const CONSOLE_LEVEL_LABELS: Record<ConsoleLogLevel, string> = {
  log: 'Logs',
  info: 'Info',
  warn: 'Warnings',
  error: 'Errors',
  debug: 'Debug',
};

export type ConsoleLevelVisual = {
  icon: MaterialIconName;
  color: string;
  /** Row tint. Only the two levels worth spotting mid-scroll get one. */
  surface?: string;
};

export const CONSOLE_LEVEL_VISUALS: Record<ConsoleLogLevel, ConsoleLevelVisual> = {
  log: { icon: 'chevron-right', color: COLORS.textSecondary },
  info: { icon: 'info-outline', color: COLORS.accent },
  warn: { icon: 'warning-amber', color: COLORS.warning, surface: COLORS.warningSurface },
  error: { icon: 'error-outline', color: COLORS.error, surface: COLORS.errorSurface },
  debug: { icon: 'bug-report', color: '#9334e6' },
};
