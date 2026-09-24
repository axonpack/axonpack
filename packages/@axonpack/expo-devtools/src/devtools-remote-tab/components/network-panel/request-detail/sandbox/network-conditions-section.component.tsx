import {
  THROTTLE_PRESET_IDS,
  THROTTLE_PRESET_LABELS,
  type ThrottlePresetId,
} from '../../../../../features/network/constants/throttle-presets.const';
import {
  USER_AGENT_PRESET_IDS,
  USER_AGENT_PRESET_LABELS,
  type UserAgentPresetId,
} from '../../../../../features/network/constants/user-agent-presets.const';
import {
  networkConditionsStore,
  useNetworkConditionsStore,
} from '../../../../../features/network/stores/network-conditions.store';
import { parsePositiveInt } from '../../../../../features/network/utils/parse-positive-int.util';
import { SyncedInput } from '../../synced-input.component';

const CUSTOM_THROTTLE_FIELDS = [
  { key: 'downloadKbps', label: 'Download (kbps)' },
  { key: 'uploadKbps', label: 'Upload (kbps)' },
  { key: 'latencyMs', label: 'Latency (ms)' },
] as const;

/**
 * Throttling and the user agent, as the app's sandbox has them. The same store as the toolbar and
 * settings, so this is the whole app's choice, not this request's. Folded to start with for that
 * reason, with what is chosen shown on the fold.
 */
export function NetworkConditionsSection() {
  const { throttleId, customThrottle, userAgentId, customUserAgent } = useNetworkConditionsStore();

  return (
    <details className="axonpack-sbx-section">
      <summary>
        Network Conditions
        <span className="axonpack-sbx-summary-end">
          {THROTTLE_PRESET_LABELS[throttleId]} · {USER_AGENT_PRESET_LABELS[userAgentId]}
        </span>
      </summary>
      <div className="axonpack-sbx-form">
        <span>Throttling</span>
        <span className="axonpack-net-select">
          <select
            value={throttleId}
            aria-label="Throttling"
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
        {throttleId === 'custom' &&
          CUSTOM_THROTTLE_FIELDS.map((field) => (
            <label key={field.key} className="axonpack-sbx-header">
              <span>{field.label}</span>
              <SyncedInput
                value={String(customThrottle[field.key])}
                onChange={(text) =>
                  networkConditionsStore.setCustomThrottle({
                    ...customThrottle,
                    [field.key]: parsePositiveInt(text),
                  })
                }
                label={field.label}
              />
            </label>
          ))}
        <span>User agent</span>
        <span className="axonpack-net-select">
          <select
            value={userAgentId}
            aria-label="User agent"
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
        {userAgentId === 'custom' && (
          <label className="axonpack-sbx-header">
            <span>Agent string</span>
            <SyncedInput
              value={customUserAgent}
              onChange={networkConditionsStore.setCustomUserAgent}
              placeholder="Custom user agent string"
            />
          </label>
        )}
        <p className="axonpack-sbx-hint">
          Shared with the whole app: a change here applies to every request, not only this one.
        </p>
      </div>
    </details>
  );
}
