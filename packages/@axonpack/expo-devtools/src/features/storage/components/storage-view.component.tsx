import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { FlatList, SectionList, Text, View } from 'react-native';

import { AdapterSelector } from './adapter-selector.component';
import { DetailPanel } from './detail-panel';
import { EmptyState } from './empty-state.component';
import { EntryRow } from './entry-row.component';
import { FiltersPanel } from './filters-panel.component';
import { StorageSummary } from './storage-summary.component';
import { readAdapterById, readAllAdapters } from '../services/read-storage.service';
import { storageStore, type StorageEntry } from '../stores/storage.store';
import { animateNextLayout } from '../../../core/utils/layout-animation.util';
import type { StoredValueKind } from '../utils/classify-value.util';
import { exportStorageSnapshot } from '../utils/export-storage-snapshot.util';
import {
  DEFAULT_STORAGE_FILTERS,
  matchesFilters,
  sortEntries,
  type StorageFilters,
  type StorageSortField,
} from '../utils/filter-entries.util';
import { namespaceOf } from '../utils/formatters.util';
import { buildMatcher } from '../../../core/utils/text-search.util';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import {
  DevtoolsToolbar,
  ToolbarDivider,
} from '../../../core/components/devtools-toolbar.component';
import { IconButton } from '../../../core/components/ui/icon-button.ui';
import { InsetPadding } from '../../../core/components/ui/inset-padding.ui';

function keyExtractor(entry: StorageEntry): string {
  return `${entry.adapterId}:${entry.key}`;
}

export function StorageView() {
  const styles = useStyles();
  const COLORS = useThemeColors();

  const { adapters } = useSyncExternalStore(storageStore.subscribe, storageStore.getSnapshot);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [filters, setFilters] = useState<StorageFilters>(DEFAULT_STORAGE_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [sort, setSort] = useState<StorageSortField>('key');
  const [descending, setDescending] = useState(false);
  const [groupByNamespace, setGroupByNamespace] = useState(false);
  /**
   * The key, not the entry: an edit replaces the entry object in the store, and a sheet holding the
   * old one would keep showing the value you just changed. A deleted key resolves to `null`, which
   * is also what closes the sheet.
   */
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const flatListRef = useRef<FlatList<StorageEntry>>(null);
  const sectionListRef = useRef<SectionList<StorageEntry>>(null);

  // Read on mount rather than on `init()`: a store the panel is never opened on shouldn't be read at
  // all, and a store read at launch would be stale by the time anyone looked.
  useEffect(() => {
    readAllAdapters();
  }, []);

  const state = adapters.find((current) => current.adapter.id === activeId) ?? adapters[0];
  const entries = state?.entries ?? [];

  // One compiled matcher for the whole list — recompiling per row would run it on every keystroke.
  const matcher = useMemo(
    () => buildMatcher({ text: filters.search, ...filters.modes }),
    [filters.search, filters.modes]
  );

  const countsByKind = useMemo(() => {
    const counts: Partial<Record<StoredValueKind, number>> = {};
    for (const entry of entries) counts[entry.kind] = (counts[entry.kind] ?? 0) + 1;
    return counts;
  }, [entries]);

  const visibleEntries = useMemo(
    () =>
      sortEntries(
        entries.filter((entry) => matchesFilters(entry, filters, matcher)),
        sort,
        descending
      ),
    [entries, filters, matcher, sort, descending]
  );

  const sections = useMemo(() => {
    if (!groupByNamespace) return [];
    const byNamespace = new Map<string, StorageEntry[]>();
    for (const entry of visibleEntries) {
      const title = namespaceOf(entry.key);
      const group = byNamespace.get(title) ?? [];
      group.push(entry);
      byNamespace.set(title, group);
    }
    return Array.from(byNamespace.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, data]) => ({ title, data }));
  }, [visibleEntries, groupByNamespace]);

  /** Only one of the two lists is mounted at a time, so the other ref is always null. */
  function scrollToTop() {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    sectionListRef.current?.getScrollResponder()?.scrollTo({ y: 0, animated: true });
  }

  function toggleFilters() {
    animateNextLayout();
    const opening = !filtersOpen;
    setFiltersOpen(opening);
    // The panel opens at the top of the scroll content, which is out of sight once you've scrolled
    // into the rows — so pressing Filter would otherwise look like it did nothing.
    if (opening) scrollToTop();
  }

  const selectEntry = useCallback((entry: StorageEntry) => setSelectedKey(entry.key), []);

  const renderRow = useCallback(
    ({ item }: { item: StorageEntry }) => (
      <EntryRow entry={item} matcher={matcher} onPress={selectEntry} />
    ),
    [matcher, selectEntry]
  );

  const selected =
    selectedKey === null ? null : (entries.find((entry) => entry.key === selectedKey) ?? null);

  if (adapters.length === 0) return <EmptyState />;

  function patchFilters(patch: Partial<StorageFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  const emptyLabel =
    state === undefined || state.status === 'reading'
      ? 'Reading…'
      : entries.length === 0
        ? 'This store holds no keys'
        : 'No keys match your filter';

  /**
   * The summary and the filters scroll with the rows rather than sitting above them. Pinned, the open
   * filter panel is tall enough to leave a phone almost no list to look at — and the list, being the
   * point of the tab, is what has to keep the screen.
   *
   * Passed as an element, not as a function: a new function each render is a new component type to
   * `VirtualizedList`, which would remount the header and drop the search box's focus on every
   * keystroke.
   */
  const listHeader = (
    <>
      {state && <StorageSummary state={state} visibleCount={visibleEntries.length} />}
      {filtersOpen && (
        <FiltersPanel
          filters={filters}
          onChange={patchFilters}
          onClear={() => setFilters(DEFAULT_STORAGE_FILTERS)}
          matcher={matcher}
          visibleCount={visibleEntries.length}
          totalCount={entries.length}
          countsByKind={countsByKind}
          sort={sort}
          onChangeSort={setSort}
          descending={descending}
          onToggleDescending={() => setDescending((current) => !current)}
          groupByNamespace={groupByNamespace}
          onChangeGroupByNamespace={setGroupByNamespace}
          moreOpen={moreOpen}
          onToggleMore={() => {
            animateNextLayout();
            setMoreOpen((current) => !current);
          }}
        />
      )}
    </>
  );

  return (
    <View style={styles.container}>
      {/* No record button and no clear button: storage is a pull, not a stream, and "clear" means
          "clear the log" in every other tab — it must never come to mean "wipe your storage". */}
      <DevtoolsToolbar
        leading=<AdapterSelector
          adapters={adapters}
          activeId={state?.adapter.id ?? null}
          onChange={(adapterId) => {
            setActiveId(adapterId);
            setSelectedKey(null);
          }}
        />>
        {adapters.length > 1 && <ToolbarDivider />}
        <IconButton
          name="refresh"
          color={COLORS.textSecondary}
          onPress={() => (state ? readAdapterById(state.adapter.id) : readAllAdapters())}
          label="Refresh"
        />
        <IconButton
          name="filter-list"
          color={filtersOpen ? COLORS.accent : COLORS.textSecondary}
          active={filtersOpen}
          onPress={toggleFilters}
          label="Filter"
        />

        <ToolbarDivider />

        <IconButton
          name="file-download"
          color={COLORS.textSecondary}
          onPress={() => state && exportStorageSnapshot(state.adapter.name, visibleEntries)}
          label="Export"
        />
      </DevtoolsToolbar>

      {groupByNamespace ? (
        <SectionList
          ref={sectionListRef}
          sections={sections}
          keyExtractor={keyExtractor}
          renderItem={renderRow}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader} selectable>
              {section.title} ({section.data.length})
            </Text>
          )}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          contentInsetAdjustmentBehavior="never"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          ListHeaderComponent={listHeader}
          ListEmptyComponent={<Text style={styles.empty}>{emptyLabel}</Text>}
          ListFooterComponent=<InsetPadding edge="bottom" />
        />
      ) : (
        <FlatList
          ref={flatListRef}
          data={visibleEntries}
          keyExtractor={keyExtractor}
          renderItem={renderRow}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={9}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          contentInsetAdjustmentBehavior="never"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          ListHeaderComponent={listHeader}
          ListEmptyComponent={<Text style={styles.empty}>{emptyLabel}</Text>}
          ListFooterComponent=<InsetPadding edge="bottom" />
        />
      )}

      <DetailPanel entry={selected} state={state} onClose={() => setSelectedKey(null)} />
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // The bounded box the rows scroll inside. Without it the list sizes to its content and the last
  // rows end up past the bottom of the panel instead of scrolling.
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  sectionHeader: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.toolbarBackground,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  empty: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: 40,
  },
}));
