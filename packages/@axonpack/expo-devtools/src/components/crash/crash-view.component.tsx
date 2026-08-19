import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { FlatList, Text, View } from 'react-native';

import { CrashDetailSheet } from './crash-detail';
import { CrashRow } from './crash-row.component';
import { crashStore, type CrashKind, type CrashRecord } from '../../stores/crash/crash.store';
import { CRASH_KIND_LABELS } from '../../utils/crash/format-crash-report.util';
import {
  buildMatcher,
  DEFAULT_SEARCH_MODES,
  testMatch,
  type SearchModes,
} from '../../utils/text-search.util';
import { makeThemedStyles, useThemeColors } from '../../utils/themed-styles.util';
import { animateNextLayout } from '../../utils/layout-animation.util';
import { DevtoolsToolbar, ToolbarDivider } from '../devtools-toolbar.component';
import { Chip } from '../ui/chip.ui';
import { IconButton } from '../ui/icon-button.ui';
import { InsetPadding } from '../ui/inset-padding.ui';
import { SearchInput } from '../ui/search-input.ui';

const KIND_ORDER: CrashKind[] = [
  'js-fatal',
  'native-exception',
  'react-render',
  'unhandled-rejection',
  'js-error',
];

function keyExtractor(record: CrashRecord): string {
  return record.id;
}

export function CrashView() {
  const styles = useStyles();
  const COLORS = useThemeColors();

  const records = useSyncExternalStore(crashStore.subscribe, crashStore.getSnapshot);

  const [search, setSearch] = useState('');
  const [searchModes, setSearchModes] = useState<SearchModes>(DEFAULT_SEARCH_MODES);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [kinds, setKinds] = useState<CrashKind[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const matcher = useMemo(
    () => buildMatcher({ text: search, ...searchModes }),
    [search, searchModes]
  );

  const countsByKind = useMemo(() => {
    const counts: Partial<Record<CrashKind, number>> = {};
    for (const record of records) counts[record.kind] = (counts[record.kind] ?? 0) + 1;
    return counts;
  }, [records]);

  const visible = useMemo(
    () =>
      records.filter((record) => {
        if (kinds.length > 0 && !kinds.includes(record.kind)) return false;
        return testMatch(`${record.name} ${record.message} ${record.stack ?? ''}`, matcher);
      }),
    [records, kinds, matcher]
  );

  const selectRecord = useCallback((record: CrashRecord) => {
    setSelectedId(record.id);
    crashStore.markSeen(record.id);
  }, []);

  const renderRow = useCallback(
    ({ item }: { item: CrashRecord }) => <CrashRow record={item} onPress={selectRecord} />,
    [selectRecord]
  );

  const selected = selectedId === null ? null : (records.find((r) => r.id === selectedId) ?? null);

  function toggleKind(kind: CrashKind) {
    setKinds((current) =>
      current.includes(kind) ? current.filter((k) => k !== kind) : [...current, kind]
    );
  }

  const listHeader = filtersOpen ? (
    <View style={styles.filters}>
      <SearchInput
        value={search}
        onChangeText={setSearch}
        modes={searchModes}
        onModesChange={setSearchModes}
        placeholder="Filter crashes"
        invalid={matcher?.invalid ?? false}
      />
      <View style={styles.chipRow}>
        {KIND_ORDER.filter((kind) => countsByKind[kind]).map((kind) => (
          <Chip
            key={kind}
            label={`${CRASH_KIND_LABELS[kind]} (${countsByKind[kind]})`}
            active={kinds.includes(kind)}
            onPress={() => toggleKind(kind)}
          />
        ))}
      </View>
    </View>
  ) : null;

  return (
    <View style={styles.container}>
      {/* No record button: a crash isn't a stream you can afford to have switched off, and there is
          nothing continuous to pause. Clear drops the collected reports, not anything on disk —
          the persisted file was already drained at launch. */}
      <DevtoolsToolbar
        onClear={() => crashStore.clear()}
        clearLabel="Clear reports"
        trailing={
          <Text style={styles.count}>
            {visible.length === records.length
              ? `${records.length}`
              : `${visible.length} / ${records.length}`}
          </Text>
        }>
        <IconButton
          name="done-all"
          color={COLORS.textSecondary}
          onPress={() => crashStore.markAllSeen()}
          label="Mark all read"
        />
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

      <FlatList
        data={visible}
        keyExtractor={keyExtractor}
        renderItem={renderRow}
        initialNumToRender={12}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {records.length === 0 ? 'No crashes recorded' : 'No crashes match your filter'}
            </Text>
            {records.length === 0 && (
              <Text style={styles.emptyNote}>
                Fatal JS errors, unhandled rejections, render errors caught by
                DevtoolsErrorBoundary, and uncaught native exceptions land here. A crash that takes
                the process down is written to disk and reported at the next launch.
              </Text>
            )}
          </View>
        }
        ListFooterComponent=<InsetPadding edge="bottom" />
      />

      <CrashDetailSheet record={selected} onClose={() => setSelectedId(null)} />
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
  filters: {
    gap: 8,
    padding: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  count: {
    fontSize: 11,
    color: COLORS.textSecondary,
    paddingHorizontal: 8,
  },
  empty: {
    gap: 8,
    paddingHorizontal: 24,
    marginTop: 48,
  },
  emptyTitle: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  emptyNote: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
  },
}));
