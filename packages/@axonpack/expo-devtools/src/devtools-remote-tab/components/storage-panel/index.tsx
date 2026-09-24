import { useEffect, useMemo, useState } from 'react';

import { AddKeyPane } from './add-key-pane.component';
import { StorageEmptyState } from './empty-state.component';
import { EntryGrid } from './entry-grid.component';
import { StorageFilterBar } from './filter-bar.component';
import { ImportPane } from './import-pane.component';
import { KeyDetail } from './key-detail';
import { StorageStatusBar } from './status-bar.component';
import { STORAGE_PANEL_CSS } from './storage-panel-css.const';
import { StorageSummary } from './summary.component';
import { StorageToolbar } from './toolbar.component';
import { buildMatcher } from '../../../core/utils/text-search.util';
import { readAllAdapters } from '../../../features/storage/services/read-storage.service';
import { useStorageViewStore } from '../../../features/storage/stores/storage-view.store';
import { storageStore, useStorageStore } from '../../../features/storage/stores/storage.store';
import {
  countByKind,
  hasActiveFilters,
  matchesFilters,
  sortEntries,
} from '../../../features/storage/utils/filter-entries.util';
import { NETWORK_PANEL_CSS } from '../../constants/network-panel-css.const';
import { SplitResizer } from '../network-panel/split-resizer.component';

/** The table's width beside an open pane, and the least a drag leaves it. */
const LIST_WIDTH = 280;
const LIST_MIN = 120;

/**
 * The key, not the entry: an edit replaces the entry object in the store, and a pane holding the old
 * one would keep showing the value you just changed.
 */
type Pane =
  { kind: 'key'; key: string; tab?: 'edit' } | { kind: 'add' } | { kind: 'import' } | null;

/**
 * Chrome's Local Storage view over the same stores the in-app Storage tab reads. The store on
 * screen, the filters and the sort are shared with the app through `storageViewStore`; which key or
 * pane is open is this surface's own business.
 */
export function StoragePanel() {
  const { adapters } = useStorageStore(storageStore.getSnapshot);
  const { activeId, filters, sort, descending } = useStorageViewStore();
  const [filterBarOpen, setFilterBarOpen] = useState(true);
  const [pane, setPane] = useState<Pane>(null);
  const [shownId, setShownId] = useState(activeId);
  const [listWidth, setListWidth] = useState(LIST_WIDTH);
  const [resizing, setResizing] = useState(false);

  // A pane left open would belong to the store no longer on screen, whichever surface switched it.
  if (activeId !== shownId) {
    setShownId(activeId);
    setPane(null);
  }

  // Read on open, as the app does: a store nobody looks at shouldn't be read at all.
  useEffect(() => {
    readAllAdapters();
  }, []);

  const state = adapters.find((current) => current.adapter.id === activeId) ?? adapters[0];
  const entries = useMemo(() => state?.entries ?? [], [state]);

  const matcher = useMemo(
    () => buildMatcher({ text: filters.search, ...filters.modes }),
    [filters.search, filters.modes]
  );
  const countsByKind = useMemo(() => countByKind(entries), [entries]);
  const visible = useMemo(
    () =>
      sortEntries(
        entries.filter((entry) => matchesFilters(entry, filters, matcher)),
        sort,
        descending
      ),
    [entries, filters, matcher, sort, descending]
  );

  if (adapters.length === 0) {
    return (
      <div className="axonpack-net axonpack-sto">
        <style>{NETWORK_PANEL_CSS}</style>
        <style>{STORAGE_PANEL_CSS}</style>
        <StorageEmptyState />
      </div>
    );
  }

  // Deleted anywhere, the app included, closes the pane with it.
  const selected =
    pane?.kind === 'key' ? entries.find((entry) => entry.key === pane.key) : undefined;
  const canEdit = state?.adapter.canEdit === true;
  const paneOpen =
    selected !== undefined || (canEdit && (pane?.kind === 'add' || pane?.kind === 'import'));
  const close = () => setPane(null);

  return (
    <div className="axonpack-net axonpack-sto">
      <style>{NETWORK_PANEL_CSS}</style>
      <style>{STORAGE_PANEL_CSS}</style>
      <StorageToolbar
        adapters={adapters}
        state={state}
        visible={visible}
        filterBarOpen={filterBarOpen}
        filtersActive={hasActiveFilters(filters)}
        onToggleFilterBar={() => setFilterBarOpen((open) => !open)}
        onAdd={() => setPane({ kind: 'add' })}
        onImport={() => setPane({ kind: 'import' })}
      />
      {filterBarOpen && (
        <StorageFilterBar
          matcher={matcher}
          totalCount={entries.length}
          countsByKind={countsByKind}
        />
      )}
      {state && <StorageSummary state={state} />}
      <div className="axonpack-net-main">
        <div
          className="axonpack-net-body"
          style={
            paneOpen
              ? {
                  flex: 'none',
                  width: `max(${LIST_MIN}px, calc(${listWidth}px + var(--net-split-drag, 0px)))`,
                }
              : undefined
          }>
          <EntryGrid
            state={state}
            visible={visible}
            matcher={matcher}
            selectedKey={selected ? selected.key : null}
            onSelect={(key, tab) => setPane({ kind: 'key', key, tab })}
          />
        </div>
        {paneOpen && state && (
          <>
            <SplitResizer
              width={listWidth}
              dragging={resizing}
              onStart={() => setResizing(true)}
              onEnd={(delta) => {
                if (delta !== undefined) setListWidth((width) => Math.max(LIST_MIN, width + delta));
                setResizing(false);
              }}
            />
            {selected ? (
              <KeyDetail
                key={selected.key}
                entry={selected}
                state={state}
                initialTab={pane?.kind === 'key' ? pane.tab : undefined}
                onClose={close}
              />
            ) : (
              <div className="axonpack-net-detail">
                <div className="axonpack-net-detail-bar">
                  <button
                    className="axonpack-net-button axonpack-net-detail-close"
                    data-icon="cross"
                    title="Close"
                    aria-label="Close"
                    onClick={close}
                  />
                  <span className="axonpack-net-detail-title">
                    {pane?.kind === 'add'
                      ? `Add a key to ${state.adapter.name}`
                      : `Import into ${state.adapter.name}`}
                  </span>
                </div>
                <div className="axonpack-net-detail-body">
                  {pane?.kind === 'add' ? (
                    <AddKeyPane adapter={state.adapter} onClose={close} />
                  ) : (
                    <ImportPane adapter={state.adapter} entries={entries} onClose={close} />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {state && <StorageStatusBar state={state} visibleCount={visible.length} />}
    </div>
  );
}
