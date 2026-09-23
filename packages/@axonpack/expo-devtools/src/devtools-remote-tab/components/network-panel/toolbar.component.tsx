import { useState } from 'react';

import { Checkbox } from './checkbox.component';
import { setNetworkPaused } from '../../../features/network/services/set-network-recording.service';
import {
  THROTTLE_PRESET_IDS,
  THROTTLE_PRESET_LABELS,
  type ThrottlePresetId,
} from '../../../features/network/constants/throttle-presets.const';
import {
  networkConditionsStore,
  useNetworkConditionsStore,
} from '../../../features/network/stores/network-conditions.store';
import {
  networkLogStore,
  useNetworkLogStore,
} from '../../../features/network/stores/network-log.store';
import {
  networkViewStore,
  useNetworkViewStore,
} from '../../../features/network/stores/network-view.store';
import {
  networkLogFileName,
  networkLogJson,
} from '../../../features/network/utils/export-network-log.util';
import {
  filterNetworkEntries,
  hasActiveFilters,
} from '../../../features/network/utils/filter-entries.util';
import { sortDirectionLabel, sortEntries } from '../../../features/network/utils/sort-entries.util';

/** Chrome's main Network toolbar, in its order: record, clear | filter | preserve | throttling | export … settings. */
export function NetworkToolbar({
  filterBarOpen,
  onToggleFilterBar,
  settingsOpen,
  onToggleSettings,
}: {
  filterBarOpen: boolean;
  onToggleFilterBar: () => void;
  settingsOpen: boolean;
  onToggleSettings: () => void;
}) {
  const recording = !useNetworkLogStore(networkLogStore.isPaused);
  const preserveLog = useNetworkLogStore(networkLogStore.isPreserveLogEnabled);
  const throttleId = useNetworkConditionsStore((state) => state.throttleId);
  const { filters, sort } = useNetworkViewStore();
  const [exportFile, setExportFile] = useState<{ href: string; name: string } | null>(null);

  // A download has to be a link the page follows itself, since a click cannot wait on the app.
  // ponytail: built on hover, so a request landing between hover and click is left out of the file.
  function buildExport() {
    const entries = sortEntries(
      filterNetworkEntries(networkLogStore.getMergedSnapshot(), filters),
      sort
    );
    setExportFile({
      href: `data:application/json;charset=utf-8,${encodeURIComponent(networkLogJson(entries))}`,
      name: networkLogFileName(),
    });
  }

  return (
    <div className="axonpack-net-bar" role="toolbar" aria-label="Network">
      <button
        className="axonpack-net-button"
        data-icon={recording ? 'record-stop' : 'record-start'}
        data-red={recording || undefined}
        aria-pressed={recording}
        title={recording ? 'Stop recording network log' : 'Record network log'}
        onClick={() => setNetworkPaused(recording)}
      />
      <button
        className="axonpack-net-button"
        data-icon="clear"
        title="Clear network log"
        onClick={networkLogStore.clear}
      />
      <span className="axonpack-net-divider" />
      <button
        className="axonpack-net-button"
        data-icon={sort.descending ? 'arrow-down' : 'arrow-up'}
        // What flipping it would give you, the same as the in-app toolbar's arrow.
        title={sortDirectionLabel({ ...sort, descending: !sort.descending })}
        onClick={() => networkViewStore.setSort({ ...sort, descending: !sort.descending })}
      />
      <button
        className="axonpack-net-button"
        data-icon={hasActiveFilters(filters) ? 'filter-filled' : 'filter'}
        aria-pressed={filterBarOpen}
        title="Filter"
        onClick={onToggleFilterBar}
      />
      <span className="axonpack-net-divider" />
      <Checkbox
        label="Preserve log"
        title="Do not clear log on page reload / navigation"
        checked={preserveLog}
        onChange={networkLogStore.setPreserveLog}
      />
      <span className="axonpack-net-divider" />
      <span className="axonpack-net-select" title="Throttling">
        <select
          value={throttleId}
          onChange={(event) =>
            networkConditionsStore.setThrottleId(event.target.value as ThrottlePresetId)
          }>
          {THROTTLE_PRESET_IDS.map((id) => (
            <option key={id} value={id}>
              {THROTTLE_PRESET_LABELS[id]}
            </option>
          ))}
        </select>
      </span>
      <span className="axonpack-net-divider" />
      <a
        className="axonpack-net-button"
        data-icon="download"
        title="Export network log (the rows the filters keep)"
        href={exportFile?.href}
        download={exportFile?.name}
        onMouseEnter={buildExport}
      />
      <span className="axonpack-net-spacer" />
      <span className="axonpack-net-divider" />
      <button
        className="axonpack-net-button"
        data-icon={settingsOpen ? 'gear-filled' : 'gear'}
        aria-pressed={settingsOpen}
        title="Network settings"
        onClick={onToggleSettings}
      />
    </div>
  );
}
