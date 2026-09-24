import type { SearchModes } from '../../../core/utils/text-search.util';
import { crashViewStore } from '../../../features/crash/stores/crash-view.store';
import type { CrashKind } from '../../../features/crash/stores/crash.store';
import {
  KIND_ORDER,
  type CrashFilters,
} from '../../../features/crash/utils/filter-crash-records.util';
import { CRASH_KIND_LABELS } from '../../../features/crash/utils/format-crash-report.util';
import { SyncedInput } from '../network-panel/synced-input.component';

const MODES: { key: keyof SearchModes; icon: string; title: string }[] = [
  { key: 'matchCase', icon: 'match-case', title: 'Match case' },
  { key: 'wholeWord', icon: 'match-whole-word', title: 'Match whole word' },
  { key: 'regex', icon: 'regular-expression', title: 'Use regular expression' },
];

/** Search over name, message and stack, then any number of kinds, offered only once they happened. */
export function CrashesFilterBar({
  filters,
  invalid,
  counts,
}: {
  filters: CrashFilters;
  invalid: boolean;
  counts: Partial<Record<CrashKind, number>>;
}) {
  const patch = crashViewStore.patchFilters;

  return (
    <div className="axonpack-net-bar axonpack-crash-filters" role="toolbar" aria-label="Filter">
      <span className="axonpack-net-filter" data-icon="filter" data-invalid={invalid || undefined}>
        <SyncedInput
          value={filters.search}
          onChange={(search) => patch({ search })}
          placeholder="Filter crashes"
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
      <span className="axonpack-net-divider" />
      <div className="axonpack-net-types" role="group" aria-label="Kind">
        {KIND_ORDER.filter((kind) => counts[kind]).map((kind) => (
          <button
            key={kind}
            className="axonpack-net-type"
            aria-pressed={filters.kinds.includes(kind)}
            onClick={() => crashViewStore.toggleKind(kind)}>
            {CRASH_KIND_LABELS[kind]} ({counts[kind]})
          </button>
        ))}
      </div>
    </div>
  );
}
