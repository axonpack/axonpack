import { LEVEL_ICONS } from '../../constants/console-icons.const';
import { rowStyle } from './row-style.util';
import type { Palette } from '../../../core/constants/theme.const';
import { consoleLevelVisuals } from '../../../features/console/constants/console-levels.const';
import type { ConsoleLogLevel } from '../../../features/console/stores/console-log.store';
import { consoleLogStore } from '../../../features/console/stores/console-log.store';
import {
  consoleViewStore,
  type ConsoleViewState,
} from '../../../features/console/stores/console-view.store';
import { hasActiveConsoleFilters } from '../../../features/console/utils/filter-console-entries.util';

// In severity order, crashes included: the counts are what tell you to look.
const COUNTED = ['warn', 'error', 'crash'] as const;

/** Record, clear, filter, then the counts at the far end, where Chrome keeps its issue counts. */
export function ConsoleToolbar({
  paused,
  view,
  counts,
  palette,
}: {
  paused: boolean;
  view: ConsoleViewState;
  counts: Partial<Record<ConsoleLogLevel, number>>;
  palette: Palette;
}) {
  const visuals = consoleLevelVisuals(palette);

  return (
    <div className="axonpack-net-bar" role="toolbar" aria-label="Console">
      <button
        className="axonpack-net-button"
        data-icon={paused ? 'record-start' : 'record-stop'}
        data-red={!paused || undefined}
        aria-pressed={!paused}
        title={paused ? 'Record console' : 'Stop recording console'}
        onClick={() => consoleLogStore.setPaused(!paused)}
      />
      <button
        className="axonpack-net-button"
        data-icon="clear"
        title="Clear console"
        onClick={consoleLogStore.clear}
      />
      <span className="axonpack-net-divider" />
      <button
        className="axonpack-net-button"
        data-icon={hasActiveConsoleFilters(view.filters) ? 'filter-filled' : 'filter'}
        aria-pressed={view.filtersOpen}
        title="Filter"
        onClick={() => consoleViewStore.setFiltersOpen(!view.filtersOpen)}
      />
      <span className="axonpack-net-spacer" />
      {COUNTED.map((level) =>
        counts[level] ? (
          <span
            key={level}
            className="axonpack-con-count"
            data-con-icon={LEVEL_ICONS[level] ?? undefined}
            style={rowStyle(visuals[level])}>
            {counts[level]}
          </span>
        ) : null
      )}
    </div>
  );
}
