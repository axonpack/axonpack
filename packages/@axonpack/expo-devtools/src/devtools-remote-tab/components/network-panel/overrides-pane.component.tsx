import { useState } from 'react';

import { OverridePane } from './request-detail/override-pane.component';
import {
  networkOverridesStore,
  useNetworkOverridesStore,
} from '../../../features/network/stores/network-overrides.store';

/**
 * The app's Overrides panel: every override and block, read from the same store, so a change here
 * shows in the app and the other way round. Edit opens the request pane's editor in place of the list.
 */
export function NetworkOverridesPane() {
  const overrides = useNetworkOverridesStore(networkOverridesStore.getSnapshot);
  const [editing, setEditing] = useState<string | null>(null);

  if (editing !== null) {
    return (
      <div className="axonpack-net-overrides">
        <OverridePane key={editing} entry={{ url: editing }} onDone={() => setEditing(null)} />
      </div>
    );
  }

  return (
    <div className="axonpack-net-overrides">
      <div className="axonpack-net-overrides-head">
        <span>
          {overrides.length} {overrides.length === 1 ? 'rule' : 'rules'}
        </span>
        <button
          className="axonpack-net-action"
          disabled={overrides.length === 0}
          onClick={() => {
            if (window.confirm('Clear all rules? Every override and block will be removed.')) {
              networkOverridesStore.clear();
            }
          }}>
          Clear all
        </button>
      </div>
      {overrides.length === 0 && (
        <p className="axonpack-net-none">No overrides or blocks. Add one from a request's menu.</p>
      )}
      {overrides.map((override) => {
        const blocked = override.action === 'block';
        return (
          <div key={override.url} className="axonpack-net-override">
            <span className="axonpack-net-override-kind" data-tone={blocked ? 'error' : undefined}>
              {blocked ? 'Blocked' : `Override ${override.status ?? 200}`}
            </span>
            <span className="axonpack-net-override-url" title={override.url}>
              {override.url}
            </span>
            {/* As in the app: a block's Override opens the editor, and saving makes it an override. */}
            <button className="axonpack-net-action" onClick={() => setEditing(override.url)}>
              {blocked ? 'Override' : 'Edit'}
            </button>
            {!blocked && (
              <button
                className="axonpack-net-action"
                onClick={() => networkOverridesStore.set({ ...override, action: 'block' })}>
                Block
              </button>
            )}
            <button
              className="axonpack-net-action"
              data-tone="error"
              onClick={() => networkOverridesStore.remove(override.url)}>
              Remove
            </button>
          </div>
        );
      })}
    </div>
  );
}
