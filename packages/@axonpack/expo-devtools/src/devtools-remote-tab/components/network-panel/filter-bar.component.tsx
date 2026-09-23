import { useMemo, useState } from 'react';

import { Checkbox } from './checkbox.component';
import { MoreFiltersMenu } from './more-filters-menu.component';
import { SyncedInput } from './synced-input.component';
import { buildMatcher, type SearchModes } from '../../../core/utils/text-search.util';
import {
  networkViewStore,
  useNetworkViewStore,
} from '../../../features/network/stores/network-view.store';
import {
  hasActiveFilters,
  type NetworkFilters,
} from '../../../features/network/utils/filter-entries.util';
import {
  RESOURCE_TYPE_LABELS,
  RESOURCE_TYPES,
} from '../../../features/network/utils/resource-type.util';

const MODES: { key: keyof SearchModes; icon: string; title: string }[] = [
  { key: 'matchCase', icon: 'match-case', title: 'Match case' },
  { key: 'wholeWord', icon: 'match-whole-word', title: 'Match whole word' },
  { key: 'regex', icon: 'regular-expression', title: 'Use regular expression' },
];

/** What "More filters" holds, counted on its button the way Chrome counts them. */
function moreFiltersCount(filters: NetworkFilters): number {
  return [
    filters.hideDataUrls,
    filters.hideFailed,
    filters.inFlightOnly,
    filters.interceptedOnly,
    filters.methods.length > 0,
    filters.sources.length > 0,
    filters.statusQuery.trim(),
    filters.minSize.trim(),
    filters.maxSize.trim(),
    filters.minDuration.trim(),
    filters.maxDuration.trim(),
  ].filter(Boolean).length;
}

/** Chrome's filter bar: the text filter, Invert, More filters, then the request types. */
export function NetworkFilterBar() {
  const { filters } = useNetworkViewStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const invalid = useMemo(
    () => buildMatcher({ text: filters.search, ...filters.modes })?.invalid ?? false,
    [filters.search, filters.modes]
  );
  const patch = networkViewStore.patchFilters;
  const count = moreFiltersCount(filters);
  const active = hasActiveFilters(filters);

  return (
    <div className="axonpack-net-bar" role="toolbar" aria-label="Filter">
      <span className="axonpack-net-filter" data-icon="filter" data-invalid={invalid || undefined}>
        <SyncedInput
          value={filters.search}
          onChange={(search) => patch({ search })}
          placeholder="Filter"
        />
        {filters.search.length > 0 && (
          <button
            className="axonpack-net-button"
            data-icon="cross-circle-filled"
            title="Clear"
            onClick={() => patch({ search: '' })}
          />
        )}
        {MODES.map((mode) => (
          <button
            key={mode.key}
            className="axonpack-net-button"
            data-icon={mode.icon}
            aria-pressed={filters.modes[mode.key]}
            title={mode.title}
            onClick={() =>
              patch({ modes: { ...filters.modes, [mode.key]: !filters.modes[mode.key] } })
            }
          />
        ))}
      </span>
      <Checkbox
        label="Invert"
        title="Inverts the search filter"
        checked={filters.invert}
        onChange={(invert) => patch({ invert })}
      />
      <button
        className="axonpack-net-button"
        data-icon="filter-clear"
        aria-disabled={!active}
        title="Clear all filters"
        onClick={() => active && networkViewStore.resetFilters()}
      />
      <span className="axonpack-net-divider" />
      <button
        className="axonpack-net-dropdown"
        data-icon="arrow-drop-down"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}>
        More filters
        {count > 0 && <span className="axonpack-net-badge">{count}</span>}
      </button>
      {menuOpen && <MoreFiltersMenu onClose={() => setMenuOpen(false)} />}
      <span className="axonpack-net-divider" />
      <div className="axonpack-net-types" role="group" aria-label="Request types to include">
        <button
          className="axonpack-net-type"
          aria-pressed={filters.type === null}
          onClick={() => patch({ type: null })}>
          All
        </button>
        <span className="axonpack-net-divider" />
        {RESOURCE_TYPES.map((type) => (
          <button
            key={type}
            className="axonpack-net-type"
            aria-pressed={filters.type === type}
            onClick={() => patch({ type })}>
            {RESOURCE_TYPE_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  );
}
