import { useMemo, useState } from 'react';

import { EditTab } from './edit-tab.component';
import { InfoTab } from './info-tab.component';
import { RawTab } from './raw-tab.component';
import { ValueTab } from './value-tab.component';
import {
  buildMatcher,
  DEFAULT_SEARCH_MODES,
  MAX_SEARCHABLE_LENGTH,
  type SearchModes,
} from '../../../../core/utils/text-search.util';
import { removeStorageKey } from '../../../../features/storage/services/write-storage.service';
import type {
  StorageAdapterState,
  StorageEntry,
} from '../../../../features/storage/stores/storage.store';
import { StorageEntryMenu } from '../entry-menu.component';
import { SearchField } from '../search-field.component';

type Tab = 'value' | 'raw' | 'edit' | 'info';

const TABS: { key: Tab; label: string }[] = [
  { key: 'value', label: 'Value' },
  { key: 'raw', label: 'Raw' },
  { key: 'edit', label: 'Edit' },
  { key: 'info', label: 'Info' },
];

/**
 * The app's key sheet, as a pane beside the table. Mounted per key, so another key starts on Value
 * with an empty search, as the app's does.
 *
 * Delete asks inside the pane rather than through `Alert`, which would open on the device.
 */
export function KeyDetail({
  entry,
  state,
  initialTab = 'value',
  onClose,
}: {
  entry: StorageEntry;
  state: StorageAdapterState;
  initialTab?: Tab;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [modes, setModes] = useState<SearchModes>(DEFAULT_SEARCH_MODES);
  const matcher = useMemo(() => buildMatcher({ text: search, ...modes }), [search, modes]);

  const { adapter } = state;
  const searchable = (tab === 'value' || tab === 'raw') && entry.text !== null;
  const tooLarge = (entry.text?.length ?? 0) > MAX_SEARCHABLE_LENGTH;

  async function remove() {
    setDeleting(true);
    setDeleteError(null);
    const message = await removeStorageKey(entry);
    setDeleting(false);
    if (message === null) onClose();
    else setDeleteError(message);
  }

  return (
    <div className="axonpack-net-detail">
      <div className="axonpack-net-detail-bar" role="tablist">
        <button
          className="axonpack-net-button axonpack-net-detail-close"
          data-icon="cross"
          title="Close"
          aria-label="Close"
          onClick={onClose}
        />
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={key === tab}
            className="axonpack-net-detail-tab"
            onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
        <span className="axonpack-net-detail-more">
          <button
            className="axonpack-net-button"
            title="More"
            aria-label="More"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}>
            <span className="axonpack-material" data-material="more-vert" />
          </button>
          {menuOpen && (
            <StorageEntryMenu
              entry={entry}
              align="right"
              onClose={() => setMenuOpen(false)}
              onDelete={adapter.canDelete ? () => setConfirming(true) : undefined}
            />
          )}
        </span>
      </div>
      {confirming && (
        <div className="axonpack-sto-confirm" role="alertdialog">
          <span>
            {deleteError ?? `Delete "${entry.key}"? It will be removed from ${adapter.name}.`}
          </span>
          <button
            className="axonpack-net-action"
            disabled={deleting}
            onClick={() => {
              setConfirming(false);
              setDeleteError(null);
            }}>
            Cancel
          </button>
          <button
            className="axonpack-net-action"
            data-tone="error"
            disabled={deleting}
            onClick={remove}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      )}
      <div className="axonpack-net-detail-body">
        <div className="axonpack-sto-key">{entry.key}</div>
        {searchable && (
          <div className="axonpack-sto-search">
            <SearchField
              value={search}
              onChange={setSearch}
              modes={modes}
              onModesChange={setModes}
              placeholder="Search this value"
              invalid={matcher?.invalid ?? false}
            />
            {tooLarge && search.length > 0 && (
              <p className="axonpack-sto-note">
                {`Value is over ${MAX_SEARCHABLE_LENGTH.toLocaleString()} characters — too large to highlight`}
              </p>
            )}
          </div>
        )}
        {tab === 'value' && <ValueTab entry={entry} matcher={matcher} />}
        {tab === 'raw' && <RawTab entry={entry} matcher={matcher} />}
        {tab === 'edit' && <EditTab entry={entry} adapter={adapter} />}
        {tab === 'info' && <InfoTab entry={entry} state={state} />}
      </div>
    </div>
  );
}
