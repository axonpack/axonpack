import { useMemo, useState } from 'react';

import { NetworkFilterBar } from './filter-bar.component';
import { NetworkOverview } from './overview.component';
import { RequestGrid } from './request-grid.component';
import { NetworkSettingsPane } from './settings-pane.component';
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

/**
 * Chrome's Network panel over the same stores the in-app Network tab reads, so every button here and
 * its twin in the app move together. Which rows are open is this surface's own business.
 */
export function NetworkPanel() {
  const [filterBarOpen, setFilterBarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
      <div className="axonpack-net-body">
        <RequestGrid visible={visible} total={logs.length} />
      </div>
      <NetworkSummaryBar visible={visible} all={logs} />
    </div>
  );
}
