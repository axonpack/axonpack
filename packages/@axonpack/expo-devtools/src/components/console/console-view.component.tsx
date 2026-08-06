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
import { COLORS } from '../../constants/colors.const';
import {
  CONSOLE_LEVEL_LABELS,
  CONSOLE_LEVEL_VISUALS,
  CONSOLE_LEVELS,
} from '../../constants/console/console-levels.const';
import { isReplEnabled } from '../../services/console/evaluate-expression.service';
import { consoleLogStore } from '../../stores/console/console-log.store';
import type { ConsoleLogEntry, ConsoleLogLevel } from '../../stores/console/console-log.store';
import { formatConsoleSource } from '../../utils/console/formatters.util';
import { animateNextLayout } from '../../utils/layout-animation.util';
import { Chip } from '../ui/chip.ui';
import { IconButton } from '../ui/icon-button.ui';
import { InsetPadding } from '../ui/inset-padding.ui';
import { RecordToggleButton } from '../ui/record-toggle-button.ui';

// How close to the end still counts as "following the tail". A few pixels of slack absorbs the
// rounding you get from variable-height rows without needing an exact match.
const NEAR_BOTTOM_SLACK = 40;

// Defined at module scope, not inline on the FlatList: a fresh `renderItem` identity on every store
// emit defeats `ConsoleRow`'s memoization, which is what a burst of logging needs most.
function keyExtractor(entry: ConsoleLogEntry): string {
  return entry.id;
}

function renderConsoleRow({ item }: ListRenderItemInfo<ConsoleLogEntry>) {
  return <ConsoleRow entry={item} />;
}

export function ConsoleView() {
  const entries = useSyncExternalStore(consoleLogStore.subscribe, consoleLogStore.getSnapshot);
  const paused = useSyncExternalStore(consoleLogStore.subscribe, consoleLogStore.isPaused);

  const [searchText, setSearchText] = useState('');
  const [activeLevel, setActiveLevel] = useState<ConsoleLogLevel | null>(null);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const listRef = useRef<FlatList<ConsoleLogEntry>>(null);
  // A ref, not state: the auto-scroll effect has to read the current value without re-running every
  // time the scroll position changes.
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

  // Only worth showing the Source filter once a WebView has actually logged something — a
  // native-only app would otherwise get a chip row with one permanently-selected option.
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
    // Left newest-first, the order the store keeps. The list is `inverted`, which both flips it to
    // read oldest-to-newest and anchors it to the newest end — so the tail follows itself.
    return filtered;
  }, [entries, activeLevel, activeSource, searchText]);

  /**
   * Unanimated on purpose. An animated scroll emits a stream of `onScroll` events at intermediate
   * offsets, and `handleScroll` can't tell those from a real drag — it would clear the follow flag
   * mid-flight and pop the jump-to-bottom button up instead. Jumping lands one event, at offset 0.
   */
  useEffect(() => {
    if (followingTail.current) listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [visibleEntries]);

  // In an inverted list the newest end is offset 0, not the content height.
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
    // Keyboard avoidance lives on `DevtoolsPanel`, not here — see the note there for why it has to
    // sit directly under the SafeAreaView.
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerActions}>
          <RecordToggleButton paused={paused} onToggle={() => consoleLogStore.setPaused(!paused)} />
          <IconButton
            name="block"
            color={COLORS.textSecondary}
            onPress={consoleLogStore.clear}
            label="Clear console"
          />

          <View style={styles.headerDivider} />

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
        </View>

        <View style={styles.headerSummary}>
          {(['warn', 'error'] as const).map((level) => {
            const { icon, color } = CONSOLE_LEVEL_VISUALS[level];
            if (!countsByLevel[level] || !icon) return null;
            return (
              <View key={level} style={styles.summaryItem}>
                <MaterialIcons name={icon} size={13} color={color} />
                <Text style={[styles.summaryCount, { color }]}>{countsByLevel[level]}</Text>
              </View>
            );
          })}
        </View>
      </View>

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
              <TouchableOpacity onPress={() => setSearchText('')} hitSlop={8}>
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
              const { icon, color } = CONSOLE_LEVEL_VISUALS[level];
              return (
                <Chip
                  key={level}
                  label={`${CONSOLE_LEVEL_LABELS[level]} (${countsByLevel[level] ?? 0})`}
                  // Same glyph and color the rows use, so a chip and its output read as one thing.
                  // Logs has no glyph by design, which leaves it a plain chip on the default accent.
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
          // A row can hold a JSON tree, so the window is kept tighter than the default 21 screens.
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

      {/* Submitting jumps to the tail even if you'd scrolled up — you asked for that output. */}
      {isReplEnabled() && <ConsolePrompt onSubmit={scrollToBottom} />}
      {/* Dropped while the keyboard is up: the keyboard already covers the home-indicator area, so
          keeping the inset would float the prompt above the keyboard by its height. */}
      {!keyboardVisible && <InsetPadding edge="bottom" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    backgroundColor: '#0000000D',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  headerDivider: {
    width: StyleSheet.hairlineWidth,
    height: 18,
    backgroundColor: COLORS.border,
    marginHorizontal: 6,
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
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 6,
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
    width: 32,
    height: 32,
    borderRadius: 16,
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
});
