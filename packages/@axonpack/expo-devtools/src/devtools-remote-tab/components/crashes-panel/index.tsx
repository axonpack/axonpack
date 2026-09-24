import { useCallback, useEffect, useMemo, useState } from 'react';

import { CrashDetail } from './crash-detail';
import { CrashList } from './crash-list.component';
import { CRASHES_PANEL_CSS } from './crashes-panel-css.const';
import { CrashesFilterBar } from './filter-bar.component';
import { CrashesToolbar } from './toolbar.component';
import { themeStore, useThemeStore } from '../../../core/stores/theme.store';
import { buildMatcher } from '../../../core/utils/text-search.util';
import { useCrashViewStore } from '../../../features/crash/stores/crash-view.store';
import { crashStore, useCrashStore } from '../../../features/crash/stores/crash.store';
import {
  countByKind,
  filterCrashRecords,
} from '../../../features/crash/utils/filter-crash-records.util';
import { NETWORK_PANEL_CSS } from '../../constants/network-panel-css.const';
import { axonpackTabStore, useAxonpackTabStore } from '../../stores/axonpack-tab.store';
import { SplitResizer } from '../network-panel/split-resizer.component';

/** The list's width beside an open report, and the least a drag leaves it. */
const LIST_WIDTH = 320;
const LIST_MIN = 160;

/**
 * The app's Crashes tab over the same stores, so clearing, reading and the filters move together on
 * both sides. Which report is open is this surface's own, like a request in Network: the phone's
 * `crashInspectionStore` would raise a sheet over the phone's screen.
 */
export function CrashesPanel() {
  const records = useCrashStore(crashStore.getSnapshot);
  const view = useCrashViewStore();
  const palette = useThemeStore(themeStore.getPalette);
  const { filters } = view;
  // A report asked for from another panel, which is what switched to this one and so mounted it.
  const requestedId = useAxonpackTabStore((state) => state.requestedCrashId);
  // The id, not the record: marking it read replaces the record object in the store.
  const [selectedId, setSelectedId] = useState<string | null>(requestedId);
  const [listWidth, setListWidth] = useState(LIST_WIDTH);
  const [resizing, setResizing] = useState(false);

  const counts = useMemo(() => countByKind(records), [records]);
  const matcher = useMemo(
    () => buildMatcher({ text: filters.search, ...filters.modes }),
    [filters.search, filters.modes]
  );
  const visible = useMemo(
    () => filterCrashRecords(records, filters, matcher),
    [records, filters, matcher]
  );
  // Stable, because every row is memoised on its props and this is one of them.
  const select = useCallback((id: string) => {
    setSelectedId(id);
    crashStore.markSeen(id);
  }, []);

  // Taken once, so coming back to this panel later does not open the same report again.
  useEffect(() => {
    if (requestedId === null) return;
    crashStore.markSeen(requestedId);
    axonpackTabStore.clearRequestedCrash();
  }, [requestedId]);

  // Cleared or pushed out of the 25, closes the pane with it.
  const selected = records.find((record) => record.id === selectedId);

  return (
    <div className="axonpack-net">
      <style>{NETWORK_PANEL_CSS}</style>
      <style>{CRASHES_PANEL_CSS}</style>
      <CrashesToolbar view={view} shown={visible.length} total={records.length} />
      {view.filtersOpen && (
        <CrashesFilterBar filters={filters} invalid={matcher?.invalid ?? false} counts={counts} />
      )}
      <div className="axonpack-net-main">
        <div
          className="axonpack-net-body"
          style={
            selected
              ? {
                  flex: 'none',
                  width: `max(${LIST_MIN}px, calc(${listWidth}px + var(--net-split-drag, 0px)))`,
                }
              : undefined
          }>
          <CrashList
            visible={visible}
            total={records.length}
            selectedId={selected ? selected.id : null}
            palette={palette}
            onSelect={select}
          />
        </div>
        {selected && (
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
            <CrashDetail record={selected} palette={palette} onClose={() => setSelectedId(null)} />
          </>
        )}
      </div>
    </div>
  );
}
