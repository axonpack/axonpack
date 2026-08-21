import { resolveRowVisual } from '../row-visual.util';
import { consoleLevelVisuals } from '../../constants/console-levels.const';
import { DARK_PALETTE } from '../../../../core/constants/theme.const';
import type { ConsoleLogEntry } from '../../stores/console-log.store';

const COLORS = DARK_PALETTE;

function entry(partial: Partial<ConsoleLogEntry>): ConsoleLogEntry {
  return {
    id: 'e1',
    level: 'log',
    parts: [],
    text: '',
    timestamp: 0,
    count: 1,
    ...partial,
  };
}

describe('resolveRowVisual', () => {
  it('leaves an ordinary row to its level', () => {
    expect(resolveRowVisual(entry({ level: 'error' }), COLORS).icon).toBe(
      consoleLevelVisuals(COLORS).error.icon
    );
  });

  // The bug this exists to prevent: one icon for every crash misreports four kinds out of five, and
  // the error level's icon does not read as a crash at all.
  it('gives each crash kind its own icon, none of them the error level one', () => {
    const errorIcon = consoleLevelVisuals(COLORS).error.icon;

    const icons = (['js-fatal', 'native-exception', 'react-render', 'unhandled-rejection'] as const)
      .map((crashKind) => resolveRowVisual(entry({ level: 'crash', crashKind }), COLORS).icon)
      .filter((icon): icon is NonNullable<typeof icon> => icon != null);

    expect(icons).toHaveLength(4);
    expect(new Set(icons).size).toBe(4);
    expect(icons).not.toContain(errorIcon);
  });

  it('keeps the level surface, so a crash sits in the same band as an error', () => {
    const visual = resolveRowVisual(entry({ level: 'crash', crashKind: 'js-fatal' }), COLORS);

    expect(visual.surface).toBe(consoleLevelVisuals(COLORS).crash.surface);
  });

  it('falls back to the level icon for a crash row with no kind on it', () => {
    expect(resolveRowVisual(entry({ level: 'crash' }), COLORS).icon).toBe(
      consoleLevelVisuals(COLORS).crash.icon
    );
  });
});
