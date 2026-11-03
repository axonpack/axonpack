import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { QueryDetailSheet } from './query-detail-sheet.component';
import { QueryRow } from './query-row.component';
import { DevtoolsToolbar } from '../../../core/components/devtools-toolbar.component';
import { InsetPadding } from '../../../core/components/ui/inset-padding.ui';
import { ReadOnlyTextInput } from '../../../core/components/ui/read-only-text-input.ui';
import { MONOSPACE } from '../../../core/constants/typography.const';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import { aiUsageStore, useAiUsageStore, type AiUsageEntry } from '../stores/ai-usage.store';

function keyExtractor(entry: AiUsageEntry): string {
  return entry.id;
}

export function AiUsageView() {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const entries = useAiUsageStore(aiUsageStore.getSnapshot);
  const paused = useAiUsageStore(aiUsageStore.isPaused);
  // The id, not the entry: cleared or pushed out of the 100 closes the sheet with it.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId === null ? null : (entries.find((e) => e.id === selectedId) ?? null);
  const renderRow = useCallback(
    ({ item }: { item: AiUsageEntry }) => <QueryRow entry={item} onPress={setSelectedId} />,
    []
  );

  return (
    <View style={styles.container}>
      <DevtoolsToolbar
        paused={paused}
        onTogglePaused={() => aiUsageStore.setPaused(!paused)}
        onClear={aiUsageStore.clear}
        clearLabel="Clear queries"
      />

      <FlatList
        data={entries}
        keyExtractor={keyExtractor}
        renderItem={renderRow}
        initialNumToRender={15}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="never"
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.badge}>
              <MaterialIcons name="smart-toy" size={22} color={COLORS.accent} />
            </View>
            <Text style={styles.title}>No agent queries yet</Text>
            <Text style={styles.lede}>
              An AI agent, or you, can read this app's devtools from a terminal. Each query and the
              reply it got shows up here. Start in the app's project folder:
            </Text>
            <ReadOnlyTextInput value="npx devtools topics" style={styles.snippet} />
          </View>
        }
        ListFooterComponent=<InsetPadding edge="bottom" />
      />

      <QueryDetailSheet entry={selected} onClose={() => setSelectedId(null)} />
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.sectionTint,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  lede: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    color: COLORS.textSecondary,
  },
  snippet: {
    alignSelf: 'stretch',
    marginTop: 6,
    padding: 10,
    fontSize: 11,
    fontFamily: MONOSPACE,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 8,
  },
}));
