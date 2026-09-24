import { useState } from 'react';

import { DraftRow } from './draft-row.component';
import { EntryRow } from './entry-row.component';
import { NewEntryRow } from './new-entry-row.component';
import { themeStore, useThemeStore } from '../../../core/stores/theme.store';
import type { Matcher } from '../../../core/utils/text-search.util';
import { isEditableValueType } from '../../../features/storage/services/define-adapter.service';
import {
  EMPTY_DRAFTS,
  storageDraftsStore,
  useStorageDraftsStore,
} from '../../../features/storage/stores/storage-drafts.store';
import {
  storageViewStore,
  useStorageViewStore,
} from '../../../features/storage/stores/storage-view.store';
import type {
  StorageAdapterState,
  StorageEntry,
} from '../../../features/storage/stores/storage.store';
import {
  groupByNamespace as groupEntriesByNamespace,
  type StorageSortField,
} from '../../../features/storage/utils/filter-entries.util';
import { emptyListLabel } from '../../../features/storage/utils/summary.util';
import { columnTemplate, dragAnchor, resizeColumns } from '../../utils/column-widths.util';
import { ColumnResizer } from '../network-panel/column-resizer.component';

/** Value takes what the others leave. It has no sort, as in the app. */
const COLUMNS: { label: string; width: number; sortKey?: StorageSortField }[] = [
  { label: 'Key', width: 220, sortKey: 'key' },
  { label: 'Type', width: 72, sortKey: 'type' },
  { label: 'Value', width: 0 },
  { label: 'Size', width: 72, sortKey: 'size' },
];
const VALUE_COLUMN = 2;
const VALUE_MIN = 120;

/**
 * Chrome's Local Storage table over the same filters and sort as the app's list.
 *
 * Every row is drawn, with no windowing: a read stops at `storage.maxKeys`, 1,000 by default, which
 * the Network grid already draws at.
 */
export function EntryGrid({
  state,
  visible,
  matcher,
  selectedKey,
  onSelect,
}: {
  state: StorageAdapterState | undefined;
  visible: readonly StorageEntry[];
  matcher: Matcher | null;
  /** While a key is open, the table is its Key column alone. */
  selectedKey: string | null;
  onSelect: (key: string, tab?: 'edit') => void;
}) {
  const { sort, descending, groupByNamespace } = useStorageViewStore();
  const palette = useThemeStore(themeStore.getPalette);
  const [widths, setWidths] = useState(() => COLUMNS.map((column) => column.width));
  const [dragging, setDragging] = useState<number | null>(null);
  const [menuKey, setMenuKey] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const compact = selectedKey !== null;
  const adapter = state?.adapter;
  const drafts = useStorageDraftsStore((current) =>
    adapter ? (current.byAdapter[adapter.id] ?? EMPTY_DRAFTS) : EMPTY_DRAFTS
  );
  const canEdit = adapter?.canEdit === true;

  const groups = groupByNamespace
    ? groupEntriesByNamespace(visible)
    : [{ title: null, data: visible }];

  function pressHeader(key: StorageSortField) {
    if (sort === key) storageViewStore.toggleDescending();
    else storageViewStore.setSort(key);
  }

  return (
    <div
      className="axonpack-net-grid"
      style={{
        gridTemplateColumns: compact
          ? '1fr'
          : columnTemplate(widths, dragging, VALUE_COLUMN, VALUE_MIN),
      }}>
      <div className="axonpack-net-row axonpack-net-head">
        {(compact ? COLUMNS.slice(0, 1) : COLUMNS).map(({ label, sortKey }) => (
          <span
            key={label}
            data-sortable={sortKey ? true : undefined}
            onClick={sortKey ? () => pressHeader(sortKey) : undefined}>
            {label}
            {sortKey === sort && <span data-icon={descending ? 'arrow-down' : 'arrow-up'} />}
          </span>
        ))}
      </div>
      {!compact &&
        COLUMNS.slice(0, -1).map(({ label }, line) => (
          <ColumnResizer
            key={label}
            column={line + 1}
            anchor={dragAnchor(widths, line, VALUE_COLUMN)}
            dragging={dragging === line}
            onStart={() => setDragging(line)}
            onEnd={(delta) => {
              if (delta !== undefined)
                setWidths((current) => resizeColumns(current, line, delta, VALUE_COLUMN));
              setDragging(null);
            }}
          />
        ))}
      {groups.map((group) => (
        <div key={group.title ?? ''}>
          {group.title !== null && (
            <div className="axonpack-net-group">{`${group.title} (${group.data.length})`}</div>
          )}
          {group.data.map((entry) => (
            <EntryRow
              key={entry.key}
              entry={entry}
              matcher={matcher}
              palette={palette}
              compact={compact}
              selected={entry.key === selectedKey}
              onSelect={onSelect}
              menuOpen={entry.key === menuKey}
              onMenu={setMenuKey}
              inlineEditable={
                canEdit && isEditableValueType(entry.valueType) && entry.error === undefined
              }
              multiline={(drafts.edits[entry.key] ?? entry.text ?? '').includes('\n')}
              editing={entry.key === editingKey}
              draft={drafts.edits[entry.key]}
              error={drafts.errors[`edit:${entry.key}`]}
              onEdit={setEditingKey}
              onDraft={(key, text) => adapter && storageDraftsStore.setEdit(adapter.id, key, text)}
            />
          ))}
        </div>
      ))}
      {drafts.added.map((row) => (
        <DraftRow
          key={row.id}
          row={row}
          compact={compact}
          error={drafts.errors[`add:${row.id}`]}
          onRemove={() => adapter && storageDraftsStore.removeRow(adapter.id, row.id)}
        />
      ))}
      {canEdit && adapter && !compact && (
        <NewEntryRow
          adapter={adapter}
          onAdd={(row) => storageDraftsStore.addRow(adapter.id, row)}
        />
      )}
      {visible.length === 0 && <p className="axonpack-net-empty">{emptyListLabel(state)}</p>}
    </div>
  );
}
