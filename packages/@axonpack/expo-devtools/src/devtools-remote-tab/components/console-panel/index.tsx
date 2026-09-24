import { useMemo } from 'react';

import { ConsoleList } from './console-list.component';
import { CONSOLE_PANEL_CSS } from './console-panel-css.const';
import { ConsoleFilterBar } from './filter-bar.component';
import { ConsolePrompt } from './prompt.component';
import { ConsoleToolbar } from './toolbar.component';
import { themeStore, useThemeStore } from '../../../core/stores/theme.store';
import { buildMatcher } from '../../../core/utils/text-search.util';
import { isReplEnabled } from '../../../features/console/services/evaluate-expression.service';
import {
  consoleLogStore,
  useConsoleLogStore,
} from '../../../features/console/stores/console-log.store';
import { useConsoleViewStore } from '../../../features/console/stores/console-view.store';
import {
  countByLevel,
  filterConsoleEntries,
  listSources,
} from '../../../features/console/utils/filter-console-entries.util';
import { NETWORK_PANEL_CSS } from '../../constants/network-panel-css.const';

/**
 * The app's Console tab in DevTools, over the same stores, so recording, clearing, the filters and
 * the prompt's draft move together on both sides. Inside `.axonpack-net` for the Network panel's bar
 * and buttons, which is why its stylesheet comes along.
 */
export function ConsolePanel() {
  const entries = useConsoleLogStore(consoleLogStore.getSnapshot);
  const paused = useConsoleLogStore(consoleLogStore.isPaused);
  const view = useConsoleViewStore();
  const palette = useThemeStore(themeStore.getPalette);
  const { filters } = view;

  const counts = useMemo(() => countByLevel(entries), [entries]);
  const sources = useMemo(() => listSources(entries), [entries]);
  // One matcher for the whole list, and its identity is what lets a row skip a render.
  const matcher = useMemo(
    () => buildMatcher({ text: filters.search, ...filters.modes }),
    [filters.search, filters.modes]
  );
  const visible = useMemo(
    () => filterConsoleEntries(entries, filters, matcher),
    [entries, filters, matcher]
  );

  return (
    <div className="axonpack-net axonpack-con">
      <style>{NETWORK_PANEL_CSS}</style>
      <style>{CONSOLE_PANEL_CSS}</style>
      <ConsoleToolbar paused={paused} view={view} counts={counts} palette={palette} />
      {view.filtersOpen && (
        <ConsoleFilterBar
          filters={filters}
          invalid={matcher?.invalid ?? false}
          total={entries.length}
          counts={counts}
          sources={sources}
          palette={palette}
        />
      )}
      <ConsoleList visible={visible} total={entries.length} matcher={matcher} palette={palette} />
      {isReplEnabled() && <ConsolePrompt />}
    </div>
  );
}
