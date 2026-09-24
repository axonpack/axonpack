import { useState } from 'react';

import {
  readAdapterById,
  readAllAdapters,
} from '../../../features/storage/services/read-storage.service';
import { storageViewStore } from '../../../features/storage/stores/storage-view.store';
import {
  EMPTY_DRAFTS,
  pendingCount,
  storageDraftsStore,
  useStorageDraftsStore,
} from '../../../features/storage/stores/storage-drafts.store';
import { syncStorageDrafts } from '../../../features/storage/services/sync-storage-drafts.service';
import type {
  StorageAdapterState,
  StorageEntry,
} from '../../../features/storage/stores/storage.store';
import {
  buildStorageExport,
  storageExportFileName,
} from '../../../features/storage/utils/build-storage-export.util';
import {
  describeAdapterKind,
  formatReadTime,
} from '../../../features/storage/utils/formatters.util';

/**
 * The app's Storage toolbar in Chrome's strip: the store, Refresh, Add key, Filter, Export, Import.
 * No record and no clear, as in the app: storage is a pull, and "clear" means "clear the log" in
 * every other panel.
 */
export function StorageToolbar({
  adapters,
  state,
  visible,
  filterBarOpen,
  filtersActive,
  onToggleFilterBar,
  onAdd,
  onImport,
}: {
  adapters: readonly StorageAdapterState[];
  state: StorageAdapterState | undefined;
  /** The rows the filters keep, which is what the export holds. */
  visible: readonly StorageEntry[];
  filterBarOpen: boolean;
  filtersActive: boolean;
  onToggleFilterBar: () => void;
  onAdd: () => void;
  onImport: () => void;
}) {
  const [exportFile, setExportFile] = useState<{ href: string; name: string } | null>(null);
  const canEdit = state?.adapter.canEdit === true;
  const adapterId = state?.adapter.id;
  const drafts = useStorageDraftsStore((current) =>
    adapterId ? (current.byAdapter[adapterId] ?? EMPTY_DRAFTS) : EMPTY_DRAFTS
  );
  const syncing = useStorageDraftsStore((current) => current.syncing);
  const pending = pendingCount(drafts);
  const failed = Object.keys(drafts.errors).length;

  // A download has to be a link the page follows itself, since a click cannot wait on the app.
  // ponytail: built on hover, so a key read between hover and click is left out of the file.
  function buildExport() {
    if (!state) return;
    const text = JSON.stringify(
      buildStorageExport(state.adapter, visible, new Date().toISOString()),
      null,
      2
    );
    setExportFile({
      href: `data:application/json;charset=utf-8,${encodeURIComponent(text)}`,
      name: storageExportFileName(state.adapter.name),
    });
  }

  return (
    <div className="axonpack-net-bar" role="toolbar" aria-label="Storage">
      {/* One registered store is not a choice, so it is named rather than offered. */}
      {adapters.length > 1 && state && (
        <span className="axonpack-net-select axonpack-sto-store" title="Store">
          <select
            value={state.adapter.id}
            onChange={(event) => storageViewStore.setActiveId(String(event.target.value))}>
            {adapters.map((current) => (
              <option key={current.adapter.id} value={current.adapter.id}>
                {`${current.adapter.name} (${current.entries.length})`}
              </option>
            ))}
          </select>
        </span>
      )}
      {adapters.length === 1 && state && (
        <strong className="axonpack-sto-store-name">{state.adapter.name}</strong>
      )}
      {state && (
        <>
          <span className="axonpack-net-badge">{describeAdapterKind(state.adapter.kind)}</span>
          <span className="axonpack-sto-read">{`Read ${formatReadTime(state.readAt)}`}</span>
          <span className="axonpack-net-divider" />
        </>
      )}
      <button
        className="axonpack-sto-text-button"
        title="Read the store again"
        onClick={() => (state ? readAdapterById(state.adapter.id) : readAllAdapters())}>
        <span className="axonpack-material" data-material="refresh" />
        Refresh
      </button>
      {canEdit && (
        <button className="axonpack-sto-text-button" title="Add a key" onClick={onAdd}>
          <span className="axonpack-material" data-material="add" />
          Add key
        </button>
      )}
      {canEdit && adapterId && (
        <>
          <span className="axonpack-net-divider" />
          <button
            className="axonpack-net-action"
            data-tone="accent"
            disabled={pending === 0 || syncing}
            title="Write every pending change to the store"
            onClick={() => syncStorageDrafts(adapterId)}>
            {syncing ? 'Syncing…' : pending === 0 ? 'Sync' : `Sync ${pending}`}
          </button>
          {pending > 0 && !syncing && (
            <button
              className="axonpack-sto-text-button"
              title="Drop every pending change"
              onClick={() => storageDraftsStore.discard(adapterId)}>
              Discard
            </button>
          )}
          {failed > 0 && (
            <span className="axonpack-sto-read" data-tone="error">
              {`${failed} not written, see the marked rows`}
            </span>
          )}
          <span className="axonpack-net-divider" />
        </>
      )}
      <button
        className="axonpack-net-button"
        data-icon={filtersActive ? 'filter-filled' : 'filter'}
        aria-pressed={filterBarOpen}
        title="Filter"
        onClick={onToggleFilterBar}
      />
      <span className="axonpack-net-divider" />
      <a
        className="axonpack-net-button"
        data-icon="download"
        title="Export a snapshot (the keys the filters keep)"
        href={exportFile?.href}
        download={exportFile?.name}
        onMouseEnter={buildExport}
      />
      {canEdit && (
        <button className="axonpack-sto-text-button" title="Import a snapshot" onClick={onImport}>
          <span className="axonpack-material" data-material="file-upload" />
          Import
        </button>
      )}
    </div>
  );
}
