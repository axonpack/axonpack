import { useState } from 'react';

import { NetworkFilterBar } from './filter-bar.component';
import { NetworkOverview } from './overview.component';
import { NetworkSettingsPane } from './settings-pane.component';
import { NetworkToolbar } from './toolbar.component';
import { useNetworkViewStore } from '../../../features/network/stores/network-view.store';
import { NETWORK_PANEL_CSS } from '../../constants/network-panel-css.const';
import { PlaceholderPanel } from '../placeholder-panel.component';

/**
 * Chrome's Network header strip over the same stores the in-app Network tab reads, so every button
 * here and its twin in the app move together. Which rows are open is this surface's own business.
 */
export function NetworkPanel() {
  const [filterBarOpen, setFilterBarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const showOverview = useNetworkViewStore((state) => state.settings.showOverview);

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
      {showOverview && <NetworkOverview />}
      <div className="axonpack-net-body">
        <PlaceholderPanel title="Network" />
      </div>
    </div>
  );
}
