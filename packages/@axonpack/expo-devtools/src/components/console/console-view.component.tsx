import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { ConsolePrompt } from './console-prompt.component';
import { ConsoleRow } from './console-row.component';
import {
  CONSOLE_LEVEL_LABELS,
  consoleLevelVisuals,
  CONSOLE_LEVELS,
} from '../../constants/console/console-levels.const';
import { HIT_SLOP, TOUCH_TARGET } from '../../constants/metrics.const';
import { isReplEnabled } from '../../services/console/evaluate-expression.service';
import { consoleLogStore } from '../../stores/console/console-log.store';
import type { ConsoleLogEntry, ConsoleLogLevel } from '../../stores/console/console-log.store';
import { formatConsoleSource } from '../../utils/console/formatters.util';
import { animateNextLayout } from '../../utils/layout-animation.util';
import { makeThemedStyles, useThemeColors } from '../../utils/themed-styles.util';
import { DevtoolsToolbar, ToolbarDivider } from '../devtools-toolbar.component';
import { Chip } from '../ui/chip.ui';
import { IconButton } from '../ui/icon-button.ui';
import { InsetPadding } from '../ui/inset-padding.ui';

const NEAR_BOTTOM_SLACK = 40;

function keyExtractor(entry: ConsoleLogEntry): string {
  return entry.id;
}

function renderConsoleRow({ item }: ListRenderItemInfo<ConsoleLogEntry>) {
  return <ConsoleRow entry={item} />;
}

export function ConsoleView() {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const entries = useSyncExternalStore(consoleLogStore.subscribe, consoleLogStore.getSnapshot);
  const paused = useSyncExternalStore(consoleLogStore.subscribe, consoleLogStore.isPaused);

  const [searchText, setSearchText] = useState('');
  const [activeLevel, setActiveLevel] = useState<ConsoleLogLevel | null>(null);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const listRef = useRef<FlatList<ConsoleLogEntry>>(null);

  const followingTail = useRef(true);

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  const countsByLevel = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const entry of entries) {
      counts[entry.level] = (counts[entry.level] ?? 0) + 1;
    }
    return counts;
  }, [entries]);

  const sources = useMemo(() => {
    const seen = new Set<string>();
    for (const entry of entries) {
      if (entry.source) seen.add(entry.source);
    }
    return seen.size > 1 ? Array.from(seen) : [];
  }, [entries]);

  const visibleEntries = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const filtered = entries.filter((entry) => {
      if (activeLevel !== null && entry.level !== activeLevel) return false;
      if (activeSource !== null && entry.source !== activeSource) return false;
      return query.length === 0 || entry.text.toLowerCase().includes(query);
    });

    return filtered;
  }, [entries, activeLevel, activeSource, searchText]);

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
            {(['warn', 'error'] as const).map((level) => {
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
            setFiltersOpen((current) => !current);
          }}
          label="Filter"
        />
      </DevtoolsToolbar>

      {filtersOpen && (
        <View style={styles.panel}>
          <View style={styles.searchRow}>
            <MaterialIcons name="search" size={16} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Filter"
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchText.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchText('')}
                hitSlop={HIT_SLOP.dense}
                style={styles.searchClear}>
                <MaterialIcons name="close" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.filterSectionLabel}>Level</Text>
          <View style={styles.chipsRow}>
            <Chip
              label={`All (${entries.length})`}
              active={activeLevel === null}
              onPress={() => setActiveLevel(null)}
            />
            {CONSOLE_LEVELS.map((level) => {
              const { icon, color } = consoleLevelVisuals(COLORS)[level];
              return (
                <Chip
                  key={level}
                  label={`${CONSOLE_LEVEL_LABELS[level]} (${countsByLevel[level] ?? 0})`}

                  icon={icon ?? undefined}
                  tint={icon ? color : undefined}
                  active={activeLevel === level}
                  onPress={() => setActiveLevel(level)}
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
                  active={activeSource === null}
                  onPress={() => setActiveSource(null)}
                />
                {sources.map((source) => (
                  <Chip
                    key={source}
                    label={formatConsoleSource(source)}
                    active={activeSource === source}
                    onPress={() => setActiveSource(source)}
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
          <TouchableOpacity style={styles.scrollToBottom} onPress={scrollToBottom} hitSlop={8}>
            <MaterialIcons name="arrow-downward" size={18} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>

      {}
      {isReplEnabled() && <ConsolePrompt onSubmit={scrollToBottom} />}
      {}
      {!keyboardVisible && <InsetPadding edge="bottom" />}
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    minHeight: TOUCH_TARGET.min,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 6,
  },

  searchClear: {
    width: TOUCH_TARGET.dense,
    height: TOUCH_TARGET.dense,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    padding: 0,
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
