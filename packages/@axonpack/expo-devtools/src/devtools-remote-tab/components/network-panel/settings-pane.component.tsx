import { Checkbox } from './checkbox.component';
import {
  networkViewStore,
  useNetworkViewStore,
} from '../../../features/network/stores/network-view.store';
import {
  SORT_KEY_LABELS,
  SORT_KEYS,
  sortDirectionLabel,
  type NetworkSortKey,
} from '../../../features/network/utils/sort-entries.util';

/** Chrome's settings pane under the gear, plus sort, which has no column headers to live on here. */
export function NetworkSettingsPane() {
  const { settings, sort } = useNetworkViewStore();
  const patch = networkViewStore.patchSettings;

  return (
    <div className="axonpack-net-settings">
      <Checkbox
        label="Big request rows"
        title="Show more information in request rows"
        checked={settings.bigRows}
        onChange={(bigRows) => patch({ bigRows })}
      />
      <Checkbox
        label="Group by fetch client"
        title="Group requests by the WebView or client that made them"
        checked={settings.groupByFetchClient}
        onChange={(groupByFetchClient) => patch({ groupByFetchClient })}
      />
      <Checkbox
        label="Overview"
        title="Show overview of network requests"
        checked={settings.showOverview}
        onChange={(showOverview) => patch({ showOverview })}
      />
      <span className="axonpack-net-checkbox">
        Sort by
        <span className="axonpack-net-select">
          <select
            value={sort.key}
            onChange={(event) =>
              networkViewStore.setSort({ ...sort, key: event.target.value as NetworkSortKey })
            }>
            {SORT_KEYS.map((key) => (
              <option key={key} value={key}>
                {SORT_KEY_LABELS[key]}
              </option>
            ))}
          </select>
        </span>
        <span className="axonpack-net-select">
          <select
            value={String(sort.descending)}
            onChange={(event) =>
              networkViewStore.setSort({ ...sort, descending: event.target.value === 'true' })
            }>
            {[true, false].map((descending) => (
              <option key={String(descending)} value={String(descending)}>
                {sortDirectionLabel({ ...sort, descending })}
              </option>
            ))}
          </select>
        </span>
      </span>
    </div>
  );
}
