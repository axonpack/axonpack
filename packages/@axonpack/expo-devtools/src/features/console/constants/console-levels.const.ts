import type { MaterialIconName } from '../../../core/components/ui/icon-button.ui';
import type { Palette } from '../../../core/constants/theme.const';
import type { ConsoleLogLevel } from '../stores/console-log.store';

export const CONSOLE_LEVELS: ConsoleLogLevel[] = ['log', 'info', 'warn', 'error', 'debug'];

export const CONSOLE_LEVEL_LABELS: Record<ConsoleLogLevel, string> = {
  log: 'Logs',
  info: 'Info',
  warn: 'Warnings',
  error: 'Errors',
  debug: 'Debug',
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
    input: { icon: 'chevron-right', color: COLORS.accent },
    result: { icon: 'chevron-left', color: COLORS.textSecondary },
  };
}
