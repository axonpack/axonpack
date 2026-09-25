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
import { navigationLogMarkdown, shareNavigationLog } from '../utils/export-navigation-log.util';
import { collectRouteNames, lastParamsFor } from '../utils/collect-route-names.util';
import { filterMoves } from '../utils/filter-moves.util';
import { timeOnScreen } from '../utils/format-navigation.util';

function keyExtractor(move: NavigationMove): string {
  return move.id;
}

export function NavigationView() {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const attached = useNavigationStore(navigationStore.isAttached);
  const moves = useNavigationStore(navigationStore.getSnapshot);
  const paused = useNavigationStore(navigationStore.isPaused);
  const backPossible = useNavigationStore(canGoBack);
  const rootState = useNavigationStore(navigationStore.getRootState);
  const { filters, filtersOpen } = useNavigationViewStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [navigateOpen, setNavigateOpen] = useState(false);

  const matcher = useMemo(
    () => buildMatcher({ text: filters.search, ...filters.modes }),
    [filters.search, filters.modes]
  );
  const visible = useMemo(() => filterMoves(moves, matcher), [moves, matcher]);
  const routeNames = useMemo(() => collectRouteNames(rootState, moves), [rootState, moves]);

  // Worked out over the whole history, not the filtered list: a hidden row still ended a stay.
  const stays = useMemo(
    () => new Map(moves.map((move, index) => [move.id, timeOnScreen(moves, index)])),
    [moves]
  );

  const renderRow = useCallback(
    ({ item }: { item: NavigationMove }) => (
      <MoveRow
        move={item}
        stayed={stays.get(item.id) ?? null}
        matcher={matcher}
        onPress={(move) => setSelectedId(move.id)}
      />
    ),
    [stays, matcher]
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
  empty: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: 40,
  },
}));
