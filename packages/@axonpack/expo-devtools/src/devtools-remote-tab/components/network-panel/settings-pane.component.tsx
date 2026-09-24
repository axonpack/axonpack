import { Checkbox } from './checkbox.component';
import { SyncedInput } from './synced-input.component';
import {
  USER_AGENT_PRESET_IDS,
  USER_AGENT_PRESET_LABELS,
  USER_AGENT_PRESET_VALUES,
  type UserAgentPresetId,
} from '../../../features/network/constants/user-agent-presets.const';
import {
  networkConditionsStore,
  useNetworkConditionsStore,
} from '../../../features/network/stores/network-conditions.store';
import {
  networkViewStore,
  useNetworkViewStore,
} from '../../../features/network/stores/network-view.store';
import { parsePositiveInt } from '../../../features/network/utils/parse-positive-int.util';
import {
  SORT_KEY_LABELS,
  SORT_KEYS,
  sortDirectionLabel,
  type NetworkSortKey,
} from '../../../features/network/utils/sort-entries.util';

/** What the Custom throttle means. Set here or in the app, and both show the same numbers. */
const CUSTOM_THROTTLE_FIELDS = [
  { key: 'downloadKbps', label: 'Download (kbps)' },
  { key: 'uploadKbps', label: 'Upload (kbps)' },
  { key: 'latencyMs', label: 'Latency (ms)' },
] as const;

/** Chrome's settings pane under the gear, plus sort, which also offers start time, the one key no column header sorts by. */
export function NetworkSettingsPane() {
  const { settings, sort } = useNetworkViewStore();
  const { userAgentId, customUserAgent, customThrottle } = useNetworkConditionsStore();
  const patch = networkViewStore.patchSettings;
  const presetAgent = USER_AGENT_PRESET_VALUES[userAgentId];

  return (
    <div className="axonpack-net-settings">
      <Checkbox
        label="Big request rows"
        title="Show more information in request rows"
        checked={settings.devtoolsBigRows}
        onChange={(devtoolsBigRows) => patch({ devtoolsBigRows })}
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
      <Checkbox
        label="Stack header values"
        title="Put each header value on its own line, under its name"
        checked={settings.devtoolsStackedHeaders}
        onChange={(devtoolsStackedHeaders) => patch({ devtoolsStackedHeaders })}
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
      <span className="axonpack-net-setting">
        User agent
        <span className="axonpack-net-select">
          <select
            value={userAgentId}
            onChange={(event) =>
              networkConditionsStore.setUserAgentId(event.target.value as UserAgentPresetId)
            }>
            {USER_AGENT_PRESET_IDS.map((id) => (
              <option key={id} value={id}>
                {USER_AGENT_PRESET_LABELS[id]}
              </option>
            ))}
          </select>
        </span>
        {userAgentId === 'custom' ? (
          <label className="axonpack-net-field" data-wide>
            <SyncedInput
              value={customUserAgent}
              onChange={networkConditionsStore.setCustomUserAgent}
              placeholder="Custom user agent string"
            />
          </label>
        ) : (
          presetAgent && <span className="axonpack-net-setting-value">{presetAgent}</span>
        )}
      </span>
      <span className="axonpack-net-setting">
        Custom throttling
        {CUSTOM_THROTTLE_FIELDS.map((field) => (
          <label key={field.key} className="axonpack-net-field">
            {field.label}
            <SyncedInput
              value={String(customThrottle[field.key])}
              onChange={(text) =>
                networkConditionsStore.setCustomThrottle({
                  ...customThrottle,
                  [field.key]: parsePositiveInt(text),
                })
              }
            />
          </label>
        ))}
      </span>
    </div>
  );
}
