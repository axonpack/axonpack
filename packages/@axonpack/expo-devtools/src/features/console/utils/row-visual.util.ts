import type { Palette } from '../../../core/constants/theme.const';
import { getCrashKindVisual } from '../../crash/constants/crash-kind-visuals.const';
import { consoleLevelVisuals, type ConsoleLevelVisual } from '../constants/console-levels.const';
import type { ConsoleLogEntry } from '../stores/console-log.store';

/**
 * How a row is drawn. A crash wears the icon and colour the Crash tab gives its kind, so the same
 * event does not look like two different things depending on which tab you are on — the level's own
 * icon stands for all five kinds at once and would misreport any single one. The surface stays with
 * the level, since that is what marks the band of rows rather than the event.
 */
export function resolveRowVisual(entry: ConsoleLogEntry, COLORS: Palette): ConsoleLevelVisual {
  const levelVisual = consoleLevelVisuals(COLORS)[entry.level];
  if (!entry.crashKind) return levelVisual;
  return { ...levelVisual, ...getCrashKindVisual(entry.crashKind, COLORS) };
}
