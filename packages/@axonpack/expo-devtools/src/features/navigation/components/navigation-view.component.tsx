import * as Clipboard from 'expo-clipboard';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import { CurrentRouteCard } from './current-route-card.component';
import { MoveDetailSheet } from './move-detail-sheet.component';
import { MoveRow } from './move-row.component';
import { NavigateSheet } from './navigate-sheet.component';
import { WaitingState } from './waiting-state.component';
import {
  DevtoolsToolbar,
  ToolbarDivider,
} from '../../../core/components/devtools-toolbar.component';
import { Chip } from '../../../core/components/ui/chip.ui';
import { IconButton } from '../../../core/components/ui/icon-button.ui';
import { InsetPadding } from '../../../core/components/ui/inset-padding.ui';
import { SearchInput } from '../../../core/components/ui/search-input.ui';
import { animateNextLayout } from '../../../core/utils/layout-animation.util';
import { buildMatcher } from '../../../core/utils/text-search.util';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import { canGoBack, goBack } from '../services/attach-navigation.service';
import { navigationViewStore, useNavigationViewStore } from '../stores/navigation-view.store';
import {
  navigationStore,
  useNavigationStore,
  type NavigationMove,
} from '../stores/navigation.store';
import { collectRouteNames, lastParamsFor } from '../utils/collect-route-names.util';
import { navigationLogMarkdown, shareNavigationLog } from '../utils/export-navigation-log.util';
import { filterMoves, listContainers } from '../utils/filter-moves.util';
import { timeOnScreen } from '../utils/format-navigation.util';

function keyExtractor(move: NavigationMove): string {
  return move.id;
}

/** The focused container's `canGoBack`, read as a selector so a move re-reads it. */
function focusedCanGoBack(): boolean {
  return canGoBack();
}

export function NavigationView() {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const attached = useNavigationStore(navigationStore.isAttached);
  const moves = useNavigationStore(navigationStore.getSnapshot);
  const paused = useNavigationStore(navigationStore.isPaused);
  const backPossible = useNavigationStore(focusedCanGoBack);
  const rootState = useNavigationStore(navigationStore.getRootState);
  const { filters, filtersOpen } = useNavigationViewStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [navigateOpen, setNavigateOpen] = useState(false);

  const matcher = useMemo(
    () => buildMatcher({ text: filters.search, ...filters.modes }),
    [filters.search, filters.modes]
  );
  const containerNames = useMemo(() => listContainers(moves), [moves]);
  const countByContainer = useMemo(() => {
    const counts = new Map<string, number>();
    for (const move of moves) counts.set(move.container, (counts.get(move.container) ?? 0) + 1);
    return counts;
  }, [moves]);
  const visible = useMemo(
    () => filterMoves(moves, matcher, filters.container),
    [moves, matcher, filters.container]
  );
  const routeNames = useMemo(() => collectRouteNames(rootState, moves), [rootState, moves]);

  // Worked out over the whole history, not the filtered list: a hidden row still ended a stay.
  const stays = useMemo(
    () => new Map(moves.map((move, index) => [move.id, timeOnScreen(moves, index)])),
    [moves]
  );

  const showContainer = containerNames.length > 1;
  const renderRow = useCallback(
    ({ item }: { item: NavigationMove }) => (
      <MoveRow
        move={item}
        stayed={stays.get(item.id) ?? null}
        matcher={matcher}
        showContainer={showContainer}
        onPress={(move) => setSelectedId(move.id)}
      />
    ),
    [stays, matcher, showContainer]
  );

  if (!attached) return <WaitingState />;

  const selected = selectedId === null ? null : (moves.find((m) => m.id === selectedId) ?? null);

  return (
    <View style={styles.container}>
      <DevtoolsToolbar
        paused={paused}
        onTogglePaused={() => navigationStore.setPaused(!paused)}
        onClear={navigationStore.clear}
        clearLabel="Clear history"
        trailing={
          <View style={styles.trailing}>
            <IconButton
              name="content-copy"
              color={COLORS.textSecondary}
              onPress={() => {
                Clipboard.setStringAsync(
                  navigationLogMarkdown(visible, navigationStore.getCurrentRoute())
                );
              }}
              label="Copy as Markdown"
            />
            <IconButton
              name="ios-share"
              color={COLORS.textSecondary}
              onPress={() => shareNavigationLog(visible)}
              label="Export"
            />
          </View>
        }>
        <IconButton
          name="filter-list"
          color={filtersOpen ? COLORS.accent : COLORS.textSecondary}
          active={filtersOpen}
          onPress={() => {
            animateNextLayout();
            navigationViewStore.setFiltersOpen(!filtersOpen);
          }}
          label="Filter"
        />
        <ToolbarDivider />
        <IconButton
          name="arrow-back"
          color={backPossible ? COLORS.textSecondary : COLORS.border}
          onPress={() => {
            const message = goBack();
            if (message !== null) Alert.alert('Could not go back', message);
          }}
          label="Go back"
        />
        <IconButton
          name="navigation"
          color={COLORS.textSecondary}
          onPress={() => setNavigateOpen(true)}
          label="Navigate"
        />
      </DevtoolsToolbar>

      <FlatList
        data={visible}
        keyExtractor={keyExtractor}
        renderItem={renderRow}
        initialNumToRender={15}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            {filtersOpen && (
              <View style={styles.filters}>
                <SearchInput
                  value={filters.search}
                  onChangeText={(search) => navigationViewStore.patchFilters({ search })}
                  modes={filters.modes}
                  onModesChange={(modes) => navigationViewStore.patchFilters({ modes })}
                  placeholder="Filter moves"
                  invalid={matcher?.invalid ?? false}
                />
                {showContainer && (
                  <>
                    <Text style={styles.filterSectionLabel}>Container</Text>
                    <View style={styles.chipsRow}>
                      <Chip
                        label={`All (${moves.length})`}
                        active={filters.container === null}
                        onPress={() => navigationViewStore.patchFilters({ container: null })}
                      />
                      {containerNames.map((name) => (
                        <Chip
                          key={name}
                          icon="account-tree"
                          label={`${name} (${countByContainer.get(name) ?? 0})`}
                          active={filters.container === name}
                          onPress={() => navigationViewStore.patchFilters({ container: name })}
                        />
                      ))}
                    </View>
                  </>
                )}
              </View>
            )}
            <CurrentRouteCard />
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {moves.length === 0 ? 'No moves recorded yet' : 'No moves match your filter'}
          </Text>
        }
        ListFooterComponent=<InsetPadding edge="bottom" />
      />

      <MoveDetailSheet
        move={selected}
        stayed={selected ? (stays.get(selected.id) ?? null) : null}
        onClose={() => setSelectedId(null)}
      />
      <NavigateSheet
        visible={navigateOpen}
        suggestions={routeNames}
        lastParams={(route) => lastParamsFor(route, moves)}
        onClose={() => setNavigateOpen(false)}
      />
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  filters: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  filterSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  empty: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: 40,
  },
}));
