import {
  crashViewStore,
  type CrashViewState,
} from '../../../features/crash/stores/crash-view.store';
import { crashStore } from '../../../features/crash/stores/crash.store';
import { hasActiveCrashFilters } from '../../../features/crash/utils/filter-crash-records.util';

/**
 * Clear, mark all read, filter, then the count. No record button, as in the app: a crash is not a
 * stream anybody can afford to have switched off.
 */
export function CrashesToolbar({
  view,
  shown,
  total,
}: {
  view: CrashViewState;
  shown: number;
  total: number;
}) {
  return (
    <div className="axonpack-net-bar" role="toolbar" aria-label="Crashes">
      <button
        className="axonpack-net-button"
        data-icon="clear"
        title="Clear reports"
        onClick={crashStore.clear}
      />
      <button
        className="axonpack-net-button"
        data-con-icon="check-double"
        title="Mark all read"
        onClick={crashStore.markAllSeen}
      />
      <span className="axonpack-net-divider" />
      <button
        className="axonpack-net-button"
        data-icon={hasActiveCrashFilters(view.filters) ? 'filter-filled' : 'filter'}
        aria-pressed={view.filtersOpen}
        title="Filter"
        onClick={() => crashViewStore.setFiltersOpen(!view.filtersOpen)}
      />
      <span className="axonpack-net-spacer" />
      <span className="axonpack-crash-count" data-con-icon="report">
        {shown === total ? total : `${shown} / ${total}`}
      </span>
    </div>
  );
}
