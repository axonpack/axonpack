import { STORAGE_SETUP_SNIPPET } from '../../../features/storage/constants/setup-snippet.const';
import { storageStore, useStorageStore } from '../../../features/storage/stores/storage.store';

/** The app's two reasons for an empty tab, which need different fixes. */
export function StorageEmptyState() {
  const enabled = useStorageStore(storageStore.isEnabled);

  if (!enabled) {
    return (
      <div className="axonpack-net-editor">
        <strong>Devtools aren't running</strong>
        <p className="axonpack-net-none">
          Nothing is captured, and no store is read, until {'<DevtoolsProvider />'} starts a client
          with enabled: true. That one flag is the whole gate that keeps this package free to ship.
        </p>
      </div>
    );
  }

  return (
    <div className="axonpack-net-editor">
      <strong>No stores registered</strong>
      <p className="axonpack-net-none">
        A key-value store is a separate install with its own native code, so this package holds no
        dependency on one and cannot find yours by itself. Hand it the store you already use and
        every key shows up here.
      </p>
      <pre className="axonpack-net-code">{STORAGE_SETUP_SNIPPET}</pre>
    </div>
  );
}
