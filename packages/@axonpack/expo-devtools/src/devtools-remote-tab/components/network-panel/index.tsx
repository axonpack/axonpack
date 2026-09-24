import { useCallback, useMemo, useState } from 'react';

import { NetworkFilterBar } from './filter-bar.component';
import { NetworkOverview } from './overview.component';
import { RequestDetail, type RequestPane } from './request-detail';
import { RequestGrid } from './request-grid.component';
import { NetworkSettingsPane } from './settings-pane.component';
import { SplitResizer } from './split-resizer.component';
import { NetworkSummaryBar } from './summary-bar.component';
import { NetworkToolbar } from './toolbar.component';
import {
  networkLogStore,
  useNetworkLogStore,
} from '../../../features/network/stores/network-log.store';
import {
  activeTimeRange,
  useNetworkViewStore,
} from '../../../features/network/stores/network-view.store';
import { filterNetworkEntries } from '../../../features/network/utils/filter-entries.util';
import { startedInRange } from '../../../features/network/utils/overview-layout.util';
import { sortEntries } from '../../../features/network/utils/sort-entries.util';
import { NETWORK_PANEL_CSS } from '../../constants/network-panel-css.const';

/** The table's width beside an open request, as Chrome starts it, and the least a drag leaves it. */
const LIST_WIDTH = 280;
const LIST_MIN = 120;

/**
 * Chrome's Network panel over the same stores the in-app Network tab reads, so every button here and
 * its twin in the app move together. Which rows are open is this surface's own business.
 */
export function NetworkPanel() {
  const [filterBarOpen, setFilterBarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // The id, not the entry: the store replaces an entry's object on every update, and a pane holding
  // the old one would keep showing a request as pending after it finished.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pane, setPane] = useState<RequestPane>('detail');
  // Stable, because every row is memoised on its props and this is one of them.
  const open = useCallback((id: string, next: RequestPane = 'detail') => {
    setSelectedId(id);
    setPane(next);
  }, []);
  const [listWidth, setListWidth] = useState(LIST_WIDTH);
  const [resizing, setResizing] = useState(false);
  const logs = useNetworkLogStore(networkLogStore.getMergedSnapshot);
  const { filters, sort, settings } = useNetworkViewStore();
  const timeRange = useNetworkViewStore(activeTimeRange);

  // The same steps, in the same order, as the app's list, so the two always agree.
  const visible = useMemo(
    () =>
      sortEntries(
        filterNetworkEntries(logs, filters).filter((entry) => startedInRange(entry, timeRange)),
        sort
      ),
    [logs, filters, timeRange, sort]
  );

  // Gone from the log, cleared or pushed out of the 1,000, closes the pane with it.
  const selected = logs.find((entry) => entry.id === selectedId);

  return (
    <div className="axonpack-net">
      <style>{NETWORK_PANEL_CSS}</style>
      <NetworkToolbar
        filterBarOpen={filterBarOpen}
        onToggleFilterBar={() => setFilterBarOpen((open) => !open)}
        settingsOpen={settingsOpen}
        onToggleSettings={() => setSettingsOpen((open) => !open)}
      />
      {filterBarOpen && <NetworkFilterBar />}
      {settingsOpen && <NetworkSettingsPane />}
      {settings.showOverview && <NetworkOverview />}
      <div className="axonpack-net-main">
        <div
          className="axonpack-net-body"
          style={
            selected
              ? {
                  flex: 'none',
                  width: `max(${LIST_MIN}px, calc(${listWidth}px + var(--net-split-drag, 0px)))`,
                }
              : undefined
          }>
          <RequestGrid
            visible={visible}
            total={logs.length}
            selectedId={selected ? selected.id : null}
            onSelect={open}
          />
        </div>
        {selected && (
          <>
            <SplitResizer
              width={listWidth}
              dragging={resizing}
              onStart={() => setResizing(true)}
              onEnd={(delta) => {
                if (delta !== undefined) setListWidth((width) => Math.max(LIST_MIN, width + delta));
                setResizing(false);
              }}
            />
            <RequestDetail
              entry={selected}
              pane={pane}
              onPane={setPane}
              onClose={() => setSelectedId(null)}
            />
          </>
        )}
      </div>
      <NetworkSummaryBar visible={visible} all={logs} />
    </div>
  );
}
