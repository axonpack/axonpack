import { useSyncExternalStore } from 'react';

import { consoleLogStore } from '../../../features/console/stores/console-log.store';
import { crashStore } from '../../../features/crash/stores/crash.store';
import { networkLogStore } from '../../../features/network/stores/network-log.store';
import { storageStore } from '../../../features/storage/stores/storage.store';

/**
 * The Axonpack tab in React Native DevTools.
 *
 * It runs in the app, against a renderer that reports what it drew, so it reads the same stores the
 * on-device panel reads and a button here clears the real one. That is why the elements are `div`
 * and `button`: they are built at the other end, in a browser.
 */
export function OverviewTab() {
  const requests = useSyncExternalStore(
    networkLogStore.subscribe,
    networkLogStore.getMergedSnapshot
  );
  const logs = useSyncExternalStore(consoleLogStore.subscribe, consoleLogStore.getSnapshot);
  const crashes = useSyncExternalStore(crashStore.subscribe, crashStore.getSnapshot);
  const storage = useSyncExternalStore(storageStore.subscribe, storageStore.getSnapshot);

  const failed = requests.filter((row) => row.kind === 'http' && row.status === 'error').length;

  return (
    <div style={{ padding: 12, font: '12px system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 13, margin: '0 0 10px' }}>Axonpack</h1>

      <Field label="requests" value={String(requests.length)} />
      <Field label="failed" value={String(failed)} tone={failed > 0 ? '#f08a8a' : undefined} />
      <Field label="console" value={String(logs.length)} />
      <Field label="crashes" value={String(crashes.length)} />
      <Field label="stores" value={String(storage.adapters.length)} />

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={() => networkLogStore.clear()}>Clear requests</button>
        <button onClick={() => consoleLogStore.clear()}>Clear console</button>
      </div>
    </div>
  );
}

function Field({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
      <span style={{ minWidth: 90, opacity: 0.6 }}>{label}</span>
      <span style={{ color: tone }}>{value}</span>
    </div>
  );
}
