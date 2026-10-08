import { COPY_ATTRIBUTE } from '@axonpack/react-native-devtools-tab';
import { useState } from 'react';

import {
  navigationViewStore,
  type NavigationViewState,
} from '../../../features/navigation/stores/navigation-view.store';
import {
  navigationStore,
  useNavigationStore,
  type NavigationMove,
} from '../../../features/navigation/stores/navigation.store';
import {
  navigationLogFileName,
  navigationLogJson,
  navigationLogMarkdown,
} from '../../../features/navigation/utils/export-navigation-log.util';

/**
 * The app's toolbar in the Network panel's order: record, clear | filter | open a screen | copy,
 * export … the count. Copy and export take the rows the filters keep, as the app's do.
 */
export function NavigationToolbar({
  view,
  visible,
  shown,
  total,
  onNavigate,
}: {
  view: NavigationViewState;
  visible: NavigationMove[];
  shown: number;
  total: number;
  onNavigate: () => void;
}) {
  const recording = !useNavigationStore(navigationStore.isPaused);
  const filtered = view.filters.search.length > 0 || view.filters.container !== null;
  const [exportFile, setExportFile] = useState<{ href: string; name: string } | null>(null);

  // A download has to be a link the page follows itself, since a click cannot wait on the app.
  // ponytail: built on hover, so a move landing between hover and click is left out of the file.
  function buildExport() {
    setExportFile({
      href: `data:application/json;charset=utf-8,${encodeURIComponent(navigationLogJson(visible))}`,
      name: navigationLogFileName(),
    });
  }

  return (
    <div className="axonpack-net-bar" role="toolbar" aria-label="Navigation">
      <button
        className="axonpack-net-button"
        data-icon={recording ? 'record-stop' : 'record-start'}
        data-red={recording || undefined}
        aria-pressed={recording}
        title={recording ? 'Stop recording moves' : 'Record moves'}
        onClick={() => navigationStore.setPaused(recording)}
      />
      <button
        className="axonpack-net-button"
        data-icon="clear"
        title="Clear history"
        onClick={navigationStore.clear}
      />
      <span className="axonpack-net-divider" />
      <button
        className="axonpack-net-button"
        data-icon={filtered ? 'filter-filled' : 'filter'}
        aria-pressed={view.filtersOpen}
        title="Filter"
        onClick={() => navigationViewStore.setFiltersOpen(!view.filtersOpen)}
      />
      <span className="axonpack-net-divider" />
      <button
        className="axonpack-nav-text-button"
        title="Open a screen or a deep link"
        onClick={onNavigate}>
        Open screen
      </button>
      <span className="axonpack-net-divider" />
      <button
        className="axonpack-net-button"
        data-icon="copy"
        title="Copy as Markdown (the rows the filters keep)"
        // Built on render, since a copy has to carry its text: 200 short lines at most.
        {...{ [COPY_ATTRIBUTE]: navigationLogMarkdown(visible, navigationStore.getCurrentRoute()) }}
      />
      <a
        className="axonpack-net-button"
        data-icon="download"
        title="Export as JSON (the rows the filters keep)"
        href={exportFile?.href}
        download={exportFile?.name}
        onMouseEnter={buildExport}
      />
      <span className="axonpack-net-spacer" />
      <span className="axonpack-nav-count">{shown === total ? total : `${shown} / ${total}`}</span>
    </div>
  );
}
