import * as Clipboard from 'expo-clipboard';
import { useCallback, useMemo, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { MoveDetailSheet } from './move-detail-sheet.component';
import { MoveRow } from './move-row.component';
import { NavigateSheet } from './navigate-sheet.component';
import { NavigatorCard } from './navigator-card.component';
import { WaitingState } from './waiting-state.component';
import { DevtoolsToolbar } from '../../../core/components/devtools-toolbar.component';
import { Chip } from '../../../core/components/ui/chip.ui';
import { CollapsibleSection } from '../../../core/components/ui/collapsible-section.ui';
import { IconButton } from '../../../core/components/ui/icon-button.ui';
import { InsetPadding } from '../../../core/components/ui/inset-padding.ui';
import { HIT_SLOP } from '../../../core/constants/metrics.const';
import { SearchInput } from '../../../core/components/ui/search-input.ui';
import { animateNextLayout } from '../../../core/utils/layout-animation.util';
import { buildMatcher } from '../../../core/utils/text-search.util';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import { navigationViewStore, useNavigationViewStore } from '../stores/navigation-view.store';
import {
  navigationStore,
  useNavigationStore,
  type NavigationMove,
} from '../stores/navigation.store';
import { collectRouteNames, lastParamsFor } from '../utils/collect-route-names.util';
import { navigationLogMarkdown, shareNavigationLog } from '../utils/export-navigation-log.util';
import { hostedContainers, resolveOnScreen } from '../utils/flatten-navigator.util';
import { filterMoves, listContainers } from '../utils/filter-moves.util';
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
  const { filters, filtersOpen, historyOpen } = useNavigationViewStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [navigateOpen, setNavigateOpen] = useState(false);
  const containers = useNavigationStore(navigationStore.getContainers);
  const latest = useNavigationStore(navigationStore.getFocusedContainer);

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
        clearLabel="Clear history">
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
        {/* Worded, because an arrow on its own read as nothing in particular. Styled like the Back
            pill on the track, the other control here that moves the app. */}
        <TouchableOpacity
          hitSlop={HIT_SLOP.default}
          accessibilityLabel="Open a screen or a deep link"
          onPress={() => setNavigateOpen(true)}
          style={styles.goTo}>
          <MaterialIcons name="open-in-new" size={13} color={COLORS.accent} />
          <Text style={styles.goToLabel}>Open screen</Text>
        </TouchableOpacity>
      </DevtoolsToolbar>

      <FlatList
        data={historyOpen ? visible : []}
        keyExtractor={keyExtractor}
        renderItem={renderRow}
        initialNumToRender={15}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <NavigatorCard />
            <View style={styles.sections}>
              <CollapsibleSection
                title="History"
                count={visible.length}
                expanded={historyOpen}
                onToggle={navigationViewStore.toggleHistory}
                // Beside what they copy and export: the rows under this header, as filtered.
                headerRight={
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
                      dense
                    />
                    <IconButton
                      name="ios-share"
                      color={COLORS.textSecondary}
                      onPress={() => shareNavigationLog(visible)}
                      label="Export"
                      dense
                    />
                  </View>
                }>
                {null}
              </CollapsibleSection>
              {historyOpen && filtersOpen && (
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
            </View>
          </View>
        }
        ListEmptyComponent={
          historyOpen ? (
            <Text style={styles.empty}>
              {moves.length === 0 ? 'No moves recorded yet' : 'No moves match your filter'}
            </Text>
          ) : null
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
        containers={containers.map((container) => container.name)}
        defaultContainer={
          latest ? resolveOnScreen(latest, hostedContainers(containers)).name : null
        }
        suggestions={(name) =>
          collectRouteNames(
            containers.find((container) => container.name === name)?.state ?? null,
            moves.filter((move) => move.container === name)
          )
        }
        lastParams={(route, name) =>
          lastParamsFor(
            route,
            moves.filter((move) => move.container === name)
          )
        }
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
  goTo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.sectionTint,
  },
  goToLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
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
  /** The accordion headers pull themselves out to the edges from this padding, as the sheets' do. */
  sections: {
    paddingHorizontal: 12,
  },
  filters: {
    paddingVertical: 12,
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
    marginTop: 24,
  },
}));
