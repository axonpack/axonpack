import { useState } from 'react';

import { MoreFiltersMenu } from './more-filters-menu.component';
import { SearchField } from './search-field.component';
import { themeStore, useThemeStore } from '../../../core/stores/theme.store';
import type { Matcher } from '../../../core/utils/text-search.util';
import {
  STORED_VALUE_ICONS,
  STORED_VALUE_KINDS,
  STORED_VALUE_LABELS,
} from '../../../features/storage/constants/value-type-icons.const';
import {
  storageViewStore,
  useStorageViewStore,
} from '../../../features/storage/stores/storage-view.store';
import {
  storedValueColor,
  type StoredValueKind,
} from '../../../features/storage/utils/classify-value.util';
import {
  hasActiveFilters,
  type StorageFilters,
} from '../../../features/storage/utils/filter-entries.util';
import { Checkbox } from '../network-panel/checkbox.component';

const SCOPES: { key: StorageFilters['scope']; label: string }[] = [
  { key: 'both', label: 'Keys + values' },
  { key: 'keys', label: 'Keys' },
  { key: 'values', label: 'Values' },
];

/**
 * The app's filter panel as Chrome's one-line filter bar: the search, Invert, clear, where to
 * search, More filters, then the types. Sort lives in the column headers here.
 */
export function StorageFilterBar({
  matcher,
  totalCount,
  countsByKind,
}: {
  matcher: Matcher | null;
  totalCount: number;
  countsByKind: Partial<Record<StoredValueKind, number>>;
}) {
  const { filters, groupByNamespace } = useStorageViewStore();
  const palette = useThemeStore(themeStore.getPalette);
  const [menuOpen, setMenuOpen] = useState(false);
  const patch = storageViewStore.patchFilters;
  const active = hasActiveFilters(filters);
  const presentKinds = STORED_VALUE_KINDS.filter((kind) => (countsByKind[kind] ?? 0) > 0);
  const moreCount = [filters.hideEmpty, filters.jsonOnly, groupByNamespace].filter(Boolean).length;

  return (
    <div className="axonpack-net-bar" role="toolbar" aria-label="Filter">
      <SearchField
        value={filters.search}
        onChange={(search) => patch({ search })}
        modes={filters.modes}
        onModesChange={(modes) => patch({ modes })}
        placeholder="Filter keys and values"
        invalid={matcher?.invalid ?? false}
      />
      <Checkbox
        label="Invert"
        title="Inverts the search and the type filter"
        checked={filters.invert}
        onChange={(invert) => patch({ invert })}
      />
      <button
        className="axonpack-net-button"
        data-icon="filter-clear"
        aria-disabled={!active}
        title="Clear all filters"
        onClick={() => active && storageViewStore.resetFilters()}
      />
      <span className="axonpack-net-divider" />
      <span className="axonpack-net-select" title="Search in">
        <select
          value={filters.scope}
          onChange={(event) =>
            patch({ scope: String(event.target.value) as StorageFilters['scope'] })
          }>
          {SCOPES.map(({ key, label }) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </span>
      <button
        className="axonpack-net-dropdown"
        data-icon="arrow-drop-down"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}>
        More filters
        {moreCount > 0 && <span className="axonpack-net-badge">{moreCount}</span>}
      </button>
      {menuOpen && <MoreFiltersMenu onClose={() => setMenuOpen(false)} />}
      {/* As in the app: one type is not a choice. */}
      {presentKinds.length > 1 && (
        <>
          <span className="axonpack-net-divider" />
          <div className="axonpack-net-types" role="group" aria-label="Value types to include">
            <button
              className="axonpack-net-type"
              aria-pressed={filters.kind === null}
              onClick={() => patch({ kind: null })}>
              {`All (${totalCount})`}
            </button>
            <span className="axonpack-net-divider" />
            {presentKinds.map((kind) => (
              <button
                key={kind}
                className="axonpack-net-type"
                aria-pressed={filters.kind === kind}
                style={
                  filters.kind === kind ? undefined : { color: storedValueColor(palette, kind) }
                }
                onClick={() => patch({ kind })}>
                <span
                  className="axonpack-material axonpack-sto-kind-icon"
                  data-material={STORED_VALUE_ICONS[kind]}
                />
                {`${STORED_VALUE_LABELS[kind]} (${countsByKind[kind] ?? 0})`}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
