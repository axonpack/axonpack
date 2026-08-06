import type { MaterialIconName } from '../../components/ui/icon-button.ui';
import type { ConsoleLogLevel } from '../../stores/console/console-log.store';
import { COLORS } from '../colors.const';

/**
 * Filter-chip order — severity ascending, matching a browser console's level dropdown. `input` and
 * `result` are deliberately absent: they're REPL rows, not a severity you'd filter down to.
 */
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
  /** `null` for a plain log — Chrome gives it no glyph, and the row keeps a spacer for alignment. */
  icon: MaterialIconName | null;
  color: string;
  /** Row tint. Only the two levels worth spotting mid-scroll get one. */
  surface?: string;
};

// Matching Chrome's console glyphs: solid fills for the levels that demand attention, nothing at
// all for a plain log. Chevrons stay reserved for things that actually expand (a JSON tree node, an
// Error's stack) — except the prompt pair below, where the chevron means direction.
export const CONSOLE_LEVEL_VISUALS: Record<ConsoleLogLevel, ConsoleLevelVisual> = {
  log: { icon: null, color: COLORS.textSecondary },
  info: { icon: 'info', color: COLORS.accent },
  warn: { icon: 'warning', color: COLORS.warning, surface: COLORS.warningSurface },
  error: { icon: 'cancel', color: COLORS.error, surface: COLORS.errorSurface },
  debug: { icon: 'bug-report', color: '#9334e6' },
  // The prompt pair, pointing the way a browser console points them: `›` for what you typed,
  // `‹` for what came back. A chevron here reads as direction, not as a disclosure.
  input: { icon: 'chevron-right', color: COLORS.accent },
  result: { icon: 'chevron-left', color: COLORS.textSecondary },
};
