import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { ConsoleCrashRow } from './console-crash-row.component';
import { ConsolePrompt } from './console-prompt.component';
import { ConsoleRow } from './console-row.component';
import {
  DevtoolsToolbar,
  ToolbarDivider,
} from '../../../core/components/devtools-toolbar.component';
import { Chip } from '../../../core/components/ui/chip.ui';
import { IconButton } from '../../../core/components/ui/icon-button.ui';
import { InsetPadding } from '../../../core/components/ui/inset-padding.ui';
import { SearchInput } from '../../../core/components/ui/search-input.ui';
import { HIT_SLOP, TOUCH_TARGET } from '../../../core/constants/metrics.const';
import { animateNextLayout } from '../../../core/utils/layout-animation.util';
import { buildMatcher } from '../../../core/utils/text-search.util';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import {
  CONSOLE_LEVEL_LABELS,
  consoleLevelVisuals,
  CONSOLE_LEVELS,
} from '../constants/console-levels.const';
import { isReplEnabled } from '../services/evaluate-expression.service';
import { consoleLogStore, useConsoleLogStore } from '../stores/console-log.store';
import type { ConsoleLogEntry } from '../stores/console-log.store';
import { consoleViewStore, useConsoleViewStore } from '../stores/console-view.store';
import {
  countByLevel,
  filterConsoleEntries,
  listSources,
} from '../utils/filter-console-entries.util';
import { formatConsoleSource } from '../utils/formatters.util';

const NEAR_BOTTOM_SLACK = 40;

function keyExtractor(entry: ConsoleLogEntry): string {
  return entry.id;
}

export function ConsoleView() {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const entries = useConsoleLogStore(consoleLogStore.getSnapshot);
  const paused = useConsoleLogStore(consoleLogStore.isPaused);

  const { filters, filtersOpen } = useConsoleViewStore();
  const patch = consoleViewStore.patchFilters;
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const listRef = useRef<FlatList<ConsoleLogEntry>>(null);

  const followingTail = useRef(true);

  const countsByLevel = useMemo(() => countByLevel(entries), [entries]);
  const sources = useMemo(() => listSources(entries), [entries]);

  // One compiled matcher for the whole list — recompiling per row would run it on every keystroke.
  const matcher = useMemo(
    () => buildMatcher({ text: filters.search, ...filters.modes }),
    [filters.search, filters.modes]
  );

  const visibleEntries = useMemo(
    () => filterConsoleEntries(entries, filters, matcher),
    [entries, filters, matcher]
  );

  const renderConsoleRow = useCallback(
    ({ item }: ListRenderItemInfo<ConsoleLogEntry>) =>
      // A crash is laid out as a report rather than a line of output, so it has a row of its own.
      item.level === 'crash' ? (
        <ConsoleCrashRow entry={item} />
      ) : (
        <ConsoleRow entry={item} matcher={matcher} />
      ),
    [matcher]
  );

  useEffect(() => {
    if (followingTail.current) listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [visibleEntries]);

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const atBottom = event.nativeEvent.contentOffset.y <= NEAR_BOTTOM_SLACK;
    followingTail.current = atBottom;
    setShowScrollToBottom(!atBottom);
  }

  function scrollToBottom() {
    followingTail.current = true;
    setShowScrollToBottom(false);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }

  return (
    <View style={styles.container}>
      <DevtoolsToolbar
        paused={paused}
        onTogglePaused={() => consoleLogStore.setPaused(!paused)}
        onClear={consoleLogStore.clear}
        clearLabel="Clear console"
        trailing={
          <View style={styles.headerSummary}>
            {/* Crash included, and in severity order: the strip is what tells you to walk over to
                this tab, so leaving out the worst rows defeated it. */}
            {(['warn', 'error', 'crash'] as const).map((level) => {
              const { icon, color } = consoleLevelVisuals(COLORS)[level];
              if (!countsByLevel[level] || !icon) return null;
              return (
                <View key={level} style={styles.summaryItem}>
                  <MaterialIcons name={icon} size={13} color={color} />
                  <Text style={[styles.summaryCount, { color }]}>{countsByLevel[level]}</Text>
                </View>
              );
            })}
          </View>
        }>
        <ToolbarDivider />
        <IconButton
          name="filter-list"
          color={filtersOpen ? COLORS.accent : COLORS.textSecondary}
          active={filtersOpen}
          onPress={() => {
            animateNextLayout();
            consoleViewStore.setFiltersOpen(!filtersOpen);
          }}
          label="Filter"
        />
      </DevtoolsToolbar>

      {filtersOpen && (
        <View style={styles.panel}>
          <SearchInput
            value={filters.search}
            onChangeText={(search) => patch({ search })}
            modes={filters.modes}
            onModesChange={(modes) => patch({ modes })}
            invalid={matcher?.invalid ?? false}
          />

          <Text style={styles.filterSectionLabel}>Level</Text>
          <View style={styles.chipsRow}>
            <Chip
              label={`All (${entries.length})`}
              active={filters.level === null}
              onPress={() => patch({ level: null })}
            />
            {CONSOLE_LEVELS.map((level) => {
              const { icon, color } = consoleLevelVisuals(COLORS)[level];
              return (
                <Chip
                  key={level}
                  label={`${CONSOLE_LEVEL_LABELS[level]} (${countsByLevel[level] ?? 0})`}

                  icon={icon ?? undefined}
                  tint={icon ? color : undefined}
                  active={filters.level === level}
                  onPress={() => patch({ level })}
                />
              );
            })}
          </View>

          {sources.length > 0 && (
            <>
              <Text style={styles.filterSectionLabel}>Source</Text>
              <View style={styles.chipsRow}>
                <Chip
                  label="All"
                  active={filters.source === null}
                  onPress={() => patch({ source: null })}
                />
                {sources.map((source) => (
                  <Chip
                    key={source}
                    label={formatConsoleSource(source)}
                    active={filters.source === source}
                    onPress={() => patch({ source })}
                  />
                ))}
              </View>
            </>
          )}
        </View>
      )}

      <View style={styles.listArea}>
        <FlatList
          ref={listRef}
          data={visibleEntries}
          keyExtractor={keyExtractor}
          renderItem={renderConsoleRow}

          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={9}
          contentContainerStyle={styles.listContent}
          contentInsetAdjustmentBehavior="never"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          inverted
          ListEmptyComponent={
            <Text style={styles.empty}>
              {entries.length === 0
                ? 'No console output captured yet'
                : 'No messages match your filter'}
            </Text>
          }
        />

        {showScrollToBottom && (
          <TouchableOpacity
            style={styles.scrollToBottom}
            onPress={scrollToBottom}
            hitSlop={HIT_SLOP.default}>
            <MaterialIcons name="arrow-downward" size={18} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>

      {}
      {isReplEnabled() && <ConsolePrompt onSubmit={scrollToBottom} />}
      {}
      <InsetPadding edge="bottom" avoidKeyboard />
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  summaryCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  panel: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
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
  listArea: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 6,
    flexGrow: 1,
  },
  scrollToBottom: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: TOUCH_TARGET.min,
    height: TOUCH_TARGET.min,
    borderRadius: TOUCH_TARGET.min / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  empty: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: 40,
  },
}));
