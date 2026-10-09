import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ActionDetailSheet } from './action-detail-sheet.component';
import { ActionRow } from './action-row.component';
import { DispatchSheet } from './dispatch-sheet.component';
import { DevtoolsToolbar } from '../../../core/components/devtools-toolbar.component';
import { JsonTree } from '../../../core/components/json-tree';
import { Chip } from '../../../core/components/ui/chip.ui';
import { CollapsibleSection } from '../../../core/components/ui/collapsible-section.ui';
import { IconButton } from '../../../core/components/ui/icon-button.ui';
import { InsetPadding } from '../../../core/components/ui/inset-padding.ui';
import { SearchInput } from '../../../core/components/ui/search-input.ui';
import { HIT_SLOP } from '../../../core/constants/metrics.const';
import type { JsonValue } from '../../../core/utils/json-tree.util';
import { animateNextLayout } from '../../../core/utils/layout-animation.util';
import { buildMatcher, testMatch } from '../../../core/utils/text-search.util';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import { reduxViewStore, useReduxViewStore } from '../stores/redux-view.store';
import { reduxStore, useReduxStore, type ReduxActionEntry } from '../stores/redux.store';
import { formatActionTypeMatcher } from '../utils/action-type-lists.util';
import { actionSearchText } from '../utils/format-redux.util';

function keyExtractor(entry: ReduxActionEntry): string {
  return entry.id;
}

export function ReduxView() {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const entries = useReduxStore(reduxStore.getSnapshot);
  const paused = useReduxStore(reduxStore.isPaused);
  const currentState = useReduxStore(reduxStore.getCurrentState);
  const allow = useReduxStore(reduxStore.getAllowList);
  const deny = useReduxStore(reduxStore.getDenyList);
  const { filters, filtersOpen, stateOpen, actionsOpen } = useReduxViewStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dispatchOpen, setDispatchOpen] = useState(false);

  const matcher = useMemo(
    () => buildMatcher({ text: filters.search, ...filters.modes }),
    [filters.search, filters.modes]
  );
  const visible = useMemo(
    () => entries.filter((entry) => testMatch(actionSearchText(entry.action), matcher)),
    [entries, matcher]
  );

  const renderRow = useCallback(
    ({ item }: { item: ReduxActionEntry }) => (
      <ActionRow entry={item} matcher={matcher} onPress={(entry) => setSelectedId(entry.id)} />
    ),
    [matcher]
  );

  const selected = selectedId === null ? null : (entries.find((e) => e.id === selectedId) ?? null);

  return (
    <View style={styles.container}>
      <DevtoolsToolbar
        paused={paused}
        onTogglePaused={() => reduxStore.setPaused(!paused)}
        onClear={reduxStore.clear}
        clearLabel="Clear actions">
        <IconButton
          name="filter-list"
          color={filtersOpen ? COLORS.accent : COLORS.textSecondary}
          active={filtersOpen}
          onPress={() => {
            animateNextLayout();
            reduxViewStore.setFiltersOpen(!filtersOpen);
          }}
          label="Filter"
        />
        <TouchableOpacity
          hitSlop={HIT_SLOP.default}
          accessibilityLabel="Dispatch an action"
          onPress={() => setDispatchOpen(true)}
          style={styles.dispatch}>
          <MaterialIcons name="send" size={13} color={COLORS.accent} />
          <Text style={styles.dispatchLabel}>Dispatch</Text>
        </TouchableOpacity>
      </DevtoolsToolbar>

      <FlatList
        data={actionsOpen ? visible : []}
        keyExtractor={keyExtractor}
        renderItem={renderRow}
        initialNumToRender={15}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.sections}>
            <CollapsibleSection
              title="Current state"
              expanded={stateOpen}
              onToggle={reduxViewStore.toggleState}>
              {stateOpen ? (
                <JsonTree value={(currentState ?? null) as JsonValue} defaultExpanded={false} />
              ) : null}
            </CollapsibleSection>
            <CollapsibleSection
              title="Actions"
              count={visible.length}
              expanded={actionsOpen}
              onToggle={reduxViewStore.toggleActions}>
              {null}
            </CollapsibleSection>
            {actionsOpen && filtersOpen && (
              <View style={styles.filters}>
                <SearchInput
                  value={filters.search}
                  onChangeText={(search) => reduxViewStore.patchFilters({ search })}
                  modes={filters.modes}
                  onModesChange={(modes) => reduxViewStore.patchFilters({ modes })}
                  placeholder="Filter actions"
                  invalid={matcher?.invalid ?? false}
                />
                {allow.length > 0 && (
                  <>
                    <Text style={styles.filterSectionLabel}>Only recording</Text>
                    <Text style={styles.listText}>
                      {allow.map(formatActionTypeMatcher).join(', ')}
                    </Text>
                  </>
                )}
                <Text style={styles.filterSectionLabel}>Not recorded</Text>
                {deny.length === 0 ? (
                  <Text style={styles.listText}>
                    Every type is recorded. Open an action to stop recording its type.
                  </Text>
                ) : (
                  <View style={styles.chipsRow}>
                    {deny.map((matcher) => (
                      <Chip
                        key={formatActionTypeMatcher(matcher)}
                        icon="close"
                        label={formatActionTypeMatcher(matcher)}
                        active={false}
                        onPress={() => reduxStore.removeDenied(matcher)}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          actionsOpen ? (
            <Text style={styles.empty}>
              {entries.length === 0 ? 'No actions recorded yet' : 'No actions match your filter'}
            </Text>
          ) : null
        }
        ListFooterComponent=<InsetPadding edge="bottom" />
      />

      <ActionDetailSheet entry={selected} onClose={() => setSelectedId(null)} />
      <DispatchSheet visible={dispatchOpen} onClose={() => setDispatchOpen(false)} />
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  dispatch: {
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
  dispatchLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
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
  listText: {
    fontSize: 12,
    color: COLORS.textSecondary,
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
