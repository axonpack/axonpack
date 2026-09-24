import { LEVEL_ICONS } from '../../constants/console-icons.const';
import { rowStyle } from './row-style.util';
import type { Palette } from '../../../core/constants/theme.const';
import type { SearchModes } from '../../../core/utils/text-search.util';
import {
  CONSOLE_LEVEL_LABELS,
  CONSOLE_LEVELS,
  consoleLevelVisuals,
} from '../../../features/console/constants/console-levels.const';
import type { ConsoleLogLevel } from '../../../features/console/stores/console-log.store';
import { consoleViewStore } from '../../../features/console/stores/console-view.store';
import type { ConsoleFilters } from '../../../features/console/utils/filter-console-entries.util';
import { formatConsoleSource } from '../../../features/console/utils/formatters.util';
import { SyncedInput } from '../network-panel/synced-input.component';

const MODES: { key: keyof SearchModes; icon: string; title: string }[] = [
  { key: 'matchCase', icon: 'match-case', title: 'Match case' },
  { key: 'wholeWord', icon: 'match-whole-word', title: 'Match whole word' },
  { key: 'regex', icon: 'regular-expression', title: 'Use regular expression' },
];

/** The app's filters panel as a bar: search with its modes, then one level, then one source. */
export function ConsoleFilterBar({
  filters,
  invalid,
  total,
  counts,
  sources,
  palette,
}: {
  filters: ConsoleFilters;
  invalid: boolean;
  total: number;
  counts: Partial<Record<ConsoleLogLevel, number>>;
  sources: string[];
  palette: Palette;
}) {
  const patch = consoleViewStore.patchFilters;
  const visuals = consoleLevelVisuals(palette);

  return (
    <div className="axonpack-net-bar axonpack-con-filters" role="toolbar" aria-label="Filter">
      <span className="axonpack-net-filter" data-icon="filter" data-invalid={invalid || undefined}>
        <SyncedInput
          value={filters.search}
          onChange={(search) => patch({ search })}
          placeholder="Filter"
        />
        {filters.search.length > 0 && (
          <button
            className="axonpack-net-button"
            data-icon="cross-circle-filled"
            title="Clear"
            onClick={() => patch({ search: '' })}
          />
        )}
        {MODES.map((mode) => (
          <button
            key={mode.key}
            className="axonpack-net-button"
            data-icon={mode.icon}
            aria-pressed={filters.modes[mode.key]}
            title={mode.title}
            onClick={() =>
              patch({ modes: { ...filters.modes, [mode.key]: !filters.modes[mode.key] } })
            }
          />
        ))}
      </span>
      <span className="axonpack-net-divider" />
      <div className="axonpack-net-types" role="group" aria-label="Level">
        <button
          className="axonpack-net-type"
          aria-pressed={filters.level === null}
          onClick={() => patch({ level: null })}>
          All ({total})
        </button>
        {CONSOLE_LEVELS.map((level) => (
          <button
            key={level}
            className="axonpack-net-type"
            data-con-icon={LEVEL_ICONS[level] ?? undefined}
            style={rowStyle(visuals[level])}
            aria-pressed={filters.level === level}
            onClick={() => patch({ level })}>
            {CONSOLE_LEVEL_LABELS[level]} ({counts[level] ?? 0})
          </button>
        ))}
      </div>
      {sources.length > 0 && (
        <>
          <span className="axonpack-net-divider" />
          <div className="axonpack-net-types" role="group" aria-label="Source">
            <button
              className="axonpack-net-type"
              aria-pressed={filters.source === null}
              onClick={() => patch({ source: null })}>
              All
            </button>
            {sources.map((source) => (
              <button
                key={source}
                className="axonpack-net-type"
                aria-pressed={filters.source === source}
                onClick={() => patch({ source })}>
                {formatConsoleSource(source)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
