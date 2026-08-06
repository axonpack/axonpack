import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo, useState, useSyncExternalStore } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { ConsoleRow } from './console-row.component';
import { COLORS } from '../../constants/colors.const';
import {
  CONSOLE_LEVEL_LABELS,
  CONSOLE_LEVEL_VISUALS,
  CONSOLE_LEVELS,
} from '../../constants/console/console-levels.const';
import { consoleLogStore } from '../../stores/console/console-log.store';
import type { ConsoleLogLevel } from '../../stores/console/console-log.store';
import { animateNextLayout } from '../../utils/layout-animation.util';
import { Chip } from '../ui/chip.ui';
import { IconButton } from '../ui/icon-button.ui';
import { InsetPadding } from '../ui/inset-padding.ui';
import { RecordToggleButton } from '../ui/record-toggle-button.ui';

export function ConsoleView() {
  const entries = useSyncExternalStore(consoleLogStore.subscribe, consoleLogStore.getSnapshot);
  const paused = useSyncExternalStore(consoleLogStore.subscribe, consoleLogStore.isPaused);

  const [searchText, setSearchText] = useState('');
  const [activeLevel, setActiveLevel] = useState<ConsoleLogLevel | null>(null);
  const [reversed, setReversed] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const countsByLevel = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const entry of entries) {
      counts[entry.level] = (counts[entry.level] ?? 0) + 1;
    }
    return counts;
  }, [entries]);

  const visibleEntries = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const filtered = entries.filter((entry) => {
      if (activeLevel !== null && entry.level !== activeLevel) return false;
      return query.length === 0 || entry.text.toLowerCase().includes(query);
    });
    // Newest-first is the stored order, so "oldest first" is the one that needs reversing.
    return reversed ? [...filtered].reverse() : filtered;
  }, [entries, activeLevel, searchText, reversed]);

  return (
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
            name={reversed ? 'arrow-upward' : 'arrow-downward'}
            color={COLORS.textSecondary}
            onPress={() => setReversed((current) => !current)}
            label={reversed ? 'Show oldest first' : 'Show newest first'}
          />
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
          {(['warn', 'error'] as const).map((level) =>
            countsByLevel[level] ? (
              <View key={level} style={styles.summaryItem}>
                <MaterialIcons
                  name={CONSOLE_LEVEL_VISUALS[level].icon}
                  size={13}
                  color={CONSOLE_LEVEL_VISUALS[level].color}
                />
                <Text style={[styles.summaryCount, { color: CONSOLE_LEVEL_VISUALS[level].color }]}>
                  {countsByLevel[level]}
                </Text>
              </View>
            ) : null
          )}
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
            {CONSOLE_LEVELS.map((level) => (
              <Chip
                key={level}
                label={`${CONSOLE_LEVEL_LABELS[level]} (${countsByLevel[level] ?? 0})`}
                active={activeLevel === level}
                onPress={() => setActiveLevel(level)}
              />
            ))}
          </View>
        </View>
      )}

      <FlatList
        data={visibleEntries}
        keyExtractor={(entry) => entry.id}
        renderItem={({ item }) => <ConsoleRow entry={item} />}
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="never"
        ListEmptyComponent={
          <Text style={styles.empty}>
            {entries.length === 0
              ? 'No console output captured yet'
              : 'No messages match your filter'}
          </Text>
        }
        ListFooterComponent=<InsetPadding edge="bottom" />
      />
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
    padding: 12,
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
  listContent: {
    paddingVertical: 6,
    paddingBottom: 24,
    flexGrow: 1,
  },
  empty: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: 40,
  },
});
