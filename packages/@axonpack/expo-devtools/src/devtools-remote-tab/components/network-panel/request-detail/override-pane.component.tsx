import { useState } from 'react';

import type { NetworkLogEntry } from '../../../../features/network/stores/network-log.store';
import {
  networkOverridesStore,
  useNetworkOverridesStore,
} from '../../../../features/network/stores/network-overrides.store';
import {
  overrideDraftFor,
  saveOverride,
  type OverrideDraft,
} from '../../../../features/network/utils/override-draft.util';
import { SyncedInput } from '../synced-input.component';

/**
 * The app's override sheet, in the request pane. The draft is this editor's own: only the saved
 * rule goes to the store, so a half-typed body never redraws the device.
 */
export function OverridePane({ entry, onDone }: { entry: NetworkLogEntry; onDone: () => void }) {
  const [draft, setDraft] = useState<OverrideDraft>(() => overrideDraftFor(entry));
  const existing = useNetworkOverridesStore((state) =>
    state.overrides.find((override) => override.url === entry.url)
  );
  const edit = (patch: Partial<OverrideDraft>) => setDraft((current) => ({ ...current, ...patch }));

  return (
    <div className="axonpack-net-editor">
      <div className="axonpack-net-editor-url">{entry.url}</div>
      <div className="axonpack-net-editor-row">
        <label className="axonpack-net-field">
          Status
          <SyncedInput
            value={draft.status}
            onChange={(status) => edit({ status })}
            label="Status"
          />
        </label>
        <label className="axonpack-net-field" data-wide>
          Content type
          <SyncedInput
            value={draft.contentType}
            onChange={(contentType) => edit({ contentType })}
            placeholder="application/json"
            label="Content type"
          />
        </label>
      </div>
      <SyncedInput
        value={draft.body}
        onChange={(body) => edit({ body })}
        placeholder="Response body"
        multiline
      />
      <p className="axonpack-net-none">
        The request is not sent while this rule is on. The body above is answered straight away, so
        the endpoint does not have to exist.
      </p>
      <div className="axonpack-net-editor-actions">
        {existing && (
          <button
            className="axonpack-net-action"
            data-tone="error"
            onClick={() => {
              networkOverridesStore.remove(entry.url);
              onDone();
            }}>
            Remove
          </button>
        )}
        <button className="axonpack-net-action" onClick={onDone}>
          Cancel
        </button>
        <button
          className="axonpack-net-action"
          data-tone="accent"
          onClick={() => {
            saveOverride(entry.url, draft);
            onDone();
          }}>
          Save
        </button>
      </div>
    </div>
  );
}
