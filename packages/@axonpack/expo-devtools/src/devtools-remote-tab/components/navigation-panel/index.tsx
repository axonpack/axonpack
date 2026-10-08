import { useCallback, useMemo, useState } from 'react';

import { NavigationFilterBar } from './filter-bar.component';
import { HistoryTable } from './history-table.component';
import { MoveDetail } from './move-detail.component';
import { NAVIGATION_PANEL_CSS } from './navigation-panel-css.const';
import { NavigatePane } from './navigate-pane.component';
import { NavigatorTree } from './navigator-tree.component';
import { NavigationToolbar } from './toolbar.component';
import { NavigationWaitingState } from './waiting-state.component';
import { buildMatcher } from '../../../core/utils/text-search.util';
import { useNavigationViewStore } from '../../../features/navigation/stores/navigation-view.store';
import {
  navigationStore,
  useNavigationStore,
} from '../../../features/navigation/stores/navigation.store';
import { filterMoves, listContainers } from '../../../features/navigation/utils/filter-moves.util';
import { timeOnScreen } from '../../../features/navigation/utils/format-navigation.util';
import { NETWORK_PANEL_CSS } from '../../constants/network-panel-css.const';
import { SplitResizer } from '../network-panel/split-resizer.component';

/** The list's width beside an open pane, and the least a drag leaves it. */
const LIST_WIDTH = 420;
const LIST_MIN = 200;

/** The id, not the move: a move is never replaced, but it can be cleared or pushed out of the 200. */
type Pane = { kind: 'move'; id: string } | { kind: 'navigate' } | null;

/**
 * The app's Navigation tab over the same stores, so the history, the filters and the record button
 * move together on both sides. Which move is open is this surface's own, as a request is in
 * Network. Every button that moves the app goes through the same service the phone's buttons do.
 */
export function NavigationPanel() {
  const attached = useNavigationStore(navigationStore.isAttached);
  const moves = useNavigationStore(navigationStore.getSnapshot);
  const view = useNavigationViewStore();
  const { filters } = view;
  const [pane, setPane] = useState<Pane>(null);
  const [listWidth, setListWidth] = useState(LIST_WIDTH);
  const [resizing, setResizing] = useState(false);
  // Stable, because every row is memoised on its props and this is one of them.
  const select = useCallback((id: string) => setPane({ kind: 'move', id }), []);

  const matcher = useMemo(
    () => buildMatcher({ text: filters.search, ...filters.modes }),
    [filters.search, filters.modes]
  );
  const containerNames = useMemo(() => listContainers(moves), [moves]);
  const visible = useMemo(
    () => filterMoves(moves, matcher, filters.container),
    [moves, matcher, filters.container]
  );
  // Over the whole history, not the filtered rows: a hidden row still ended a stay.
  const stays = useMemo(
    () => new Map(moves.map((move, index) => [move.id, timeOnScreen(moves, index)])),
    [moves]
  );

  if (!attached) {
    return (
      <div className="axonpack-net axonpack-nav">
        <style>{NETWORK_PANEL_CSS}</style>
        <style>{NAVIGATION_PANEL_CSS}</style>
        <NavigationWaitingState />
      </div>
    );
  }

  const selected = pane?.kind === 'move' ? moves.find((move) => move.id === pane.id) : undefined;
  const paneOpen = selected !== undefined || pane?.kind === 'navigate';
  const close = () => setPane(null);

  return (
    <div className="axonpack-net axonpack-nav">
      <style>{NETWORK_PANEL_CSS}</style>
      <style>{NAVIGATION_PANEL_CSS}</style>
      <NavigationToolbar
        view={view}
        visible={visible}
        shown={visible.length}
        total={moves.length}
        onNavigate={() => setPane({ kind: 'navigate' })}
      />
      {view.filtersOpen && (
        <NavigationFilterBar
          filters={filters}
          invalid={matcher?.invalid ?? false}
          moves={moves}
          containers={containerNames}
        />
      )}
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
          <NavigatorTree />
          <HistoryTable
            visible={visible}
            total={moves.length}
            stays={stays}
            matcher={matcher}
            showContainer={containerNames.length > 1}
            selectedId={selected ? selected.id : null}
            onSelect={select}
          />
        </div>
        {paneOpen && (
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
              <MoveDetail move={selected} stayed={stays.get(selected.id) ?? null} onClose={close} />
            ) : (
              <NavigatePane moves={moves} onClose={close} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
