import type { MaterialIconName } from '../../../core/components/ui/icon-button.ui';
import type { Palette } from '../../../core/constants/theme.const';
import type { ConsoleLogLevel } from '../stores/console-log.store';

export const CONSOLE_LEVELS: ConsoleLogLevel[] = ['log', 'info', 'warn', 'error', 'debug', 'crash'];

export const CONSOLE_LEVEL_LABELS: Record<ConsoleLogLevel, string> = {
  log: 'Logs',
  info: 'Info',
  warn: 'Warnings',
  error: 'Errors',
  debug: 'Debug',
  crash: 'Crashes',
  input: 'Input',
  result: 'Result',
};

export type ConsoleLevelVisual = {
  icon: MaterialIconName | null;
  color: string;

  surface?: string;
};

export function consoleLevelVisuals(COLORS: Palette): Record<ConsoleLogLevel, ConsoleLevelVisual> {
  return {
    log: { icon: null, color: COLORS.textSecondary },
    info: { icon: 'info', color: COLORS.accent },
    warn: { icon: 'warning', color: COLORS.warning, surface: COLORS.warningSurface },
    error: { icon: 'cancel', color: COLORS.error, surface: COLORS.errorSurface },
    debug: { icon: 'bug-report', color: '#9334e6' },
    /**
     * The filter chip's icon, and the fallback for a row with no kind on it. A row that has one wears
     * the Crash tab's icon for that kind instead — `dangerous` belongs to a fatal JS error alone, and
     * a level standing for five kinds should not claim any one of them.
     */
    crash: { icon: 'report', color: COLORS.error, surface: COLORS.errorSurface },
    input: { icon: 'chevron-right', color: COLORS.accent },
    result: { icon: 'chevron-left', color: COLORS.textSecondary },
  };
}
