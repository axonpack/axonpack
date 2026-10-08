import type { SearchModes } from '../../../core/utils/text-search.util';
import {
  navigationViewStore,
  type NavigationFilters,
} from '../../../features/navigation/stores/navigation-view.store';
import type { NavigationMove } from '../../../features/navigation/stores/navigation.store';
import { SyncedInput } from '../network-panel/synced-input.component';

const MODES: { key: keyof SearchModes; icon: string; title: string }[] = [
  { key: 'matchCase', icon: 'match-case', title: 'Match case' },
  { key: 'wholeWord', icon: 'match-whole-word', title: 'Match whole word' },
  { key: 'regex', icon: 'regular-expression', title: 'Use regular expression' },
];

/** Search over the action, the routes, the path and the params, then one container once there are two. */
export function NavigationFilterBar({
  filters,
  invalid,
  moves,
  containers,
}: {
  filters: NavigationFilters;
  invalid: boolean;
  moves: NavigationMove[];
  containers: string[];
}) {
  const patch = navigationViewStore.patchFilters;

  return (
    <div className="axonpack-net-bar axonpack-nav-filters" role="toolbar" aria-label="Filter">
      <span className="axonpack-net-filter" data-icon="filter" data-invalid={invalid || undefined}>
        <SyncedInput
          value={filters.search}
          onChange={(search) => patch({ search })}
          placeholder="Filter moves"
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
      {containers.length > 1 && (
        <>
          <span className="axonpack-net-divider" />
          <div className="axonpack-net-types" role="group" aria-label="Container">
            <button
              className="axonpack-net-type"
              aria-pressed={filters.container === null}
              onClick={() => patch({ container: null })}>
              All ({moves.length})
            </button>
            {containers.map((name) => (
              <button
                key={name}
                className="axonpack-net-type"
                aria-pressed={filters.container === name}
                onClick={() => patch({ container: name })}>
                {name} ({moves.filter((move) => move.container === name).length})
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
