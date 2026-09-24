import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, SectionList, Text, View } from 'react-native';

import { AdapterSelector } from './adapter-selector.component';
import { AddKeySheet } from './add-key-sheet.component';
import { DetailPanel } from './detail-panel';
import { EmptyState } from './empty-state.component';
import { EntryRow } from './entry-row.component';
import { FiltersPanel } from './filters-panel.component';
import { ImportSheet } from './import-sheet.component';
import { StorageSummary } from './storage-summary.component';
import {
  DevtoolsToolbar,
  ToolbarDivider,
} from '../../../core/components/devtools-toolbar.component';
import { IconButton } from '../../../core/components/ui/icon-button.ui';
import { InsetPadding } from '../../../core/components/ui/inset-padding.ui';
import { animateNextLayout } from '../../../core/utils/layout-animation.util';
import { buildMatcher } from '../../../core/utils/text-search.util';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import { readAdapterById, readAllAdapters } from '../services/read-storage.service';
import { storageViewStore, useStorageViewStore } from '../stores/storage-view.store';
import { storageStore, type StorageEntry, useStorageStore } from '../stores/storage.store';
import { exportStorageSnapshot } from '../utils/export-storage-snapshot.util';
import {
  countByKind,
  groupByNamespace as groupEntriesByNamespace,
  matchesFilters,
  sortEntries,
} from '../utils/filter-entries.util';
import { emptyListLabel } from '../utils/summary.util';

function keyExtractor(entry: StorageEntry): string {
  return `${entry.adapterId}:${entry.key}`;
}

export function StorageView() {
  const styles = useStyles();
  const COLORS = useThemeColors();

  const { adapters } = useStorageStore(storageStore.getSnapshot);

  const { activeId, filters, sort, descending, groupByNamespace } = useStorageViewStore();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  /**
   * The key, not the entry: an edit replaces the entry object in the store, and a sheet holding the
   * old one would keep showing the value you just changed. A deleted key resolves to `null`, which
   * is also what closes the sheet.
   */
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [shownId, setShownId] = useState(activeId);

  // The store can be switched from the DevTools tab too, and a key or a sheet left open here would
  // belong to the store that is no longer on screen.
  if (activeId !== shownId) {
    setShownId(activeId);
    setSelectedKey(null);
    setAddOpen(false);
    setImportOpen(false);
  }

  const flatListRef = useRef<FlatList<StorageEntry>>(null);
  const sectionListRef = useRef<SectionList<StorageEntry>>(null);

  // Read on mount rather than at start: a store the panel is never opened on shouldn't be read at
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

  const countsByKind = useMemo(() => countByKind(entries), [entries]);

  const visibleEntries = useMemo(
    () =>
      sortEntries(
        entries.filter((entry) => matchesFilters(entry, filters, matcher)),
        sort,
        descending
      ),
    [entries, filters, matcher, sort, descending]
  );

  const sections = useMemo(
    () => (groupByNamespace ? groupEntriesByNamespace(visibleEntries) : []),
    [visibleEntries, groupByNamespace]
  );

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

  const emptyLabel = emptyListLabel(state);

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
          onChange={storageViewStore.patchFilters}
          onClear={storageViewStore.resetFilters}
          matcher={matcher}
          visibleCount={visibleEntries.length}
          totalCount={entries.length}
          countsByKind={countsByKind}
          sort={sort}
          onChangeSort={storageViewStore.setSort}
          descending={descending}
          onToggleDescending={storageViewStore.toggleDescending}
          groupByNamespace={groupByNamespace}
          onChangeGroupByNamespace={storageViewStore.setGroupByNamespace}
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
          onChange={storageViewStore.setActiveId}
        />>
        {adapters.length > 1 && <ToolbarDivider />}
        <IconButton
          name="refresh"
          color={COLORS.textSecondary}
          onPress={() => (state ? readAdapterById(state.adapter.id) : readAllAdapters())}
          label="Refresh"
        />
        {state?.adapter.canEdit === true && (
          <IconButton
            name="add"
            color={COLORS.textSecondary}
            onPress={() => setAddOpen(true)}
            label="Add key"
          />
        )}
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
          onPress={() => state && exportStorageSnapshot(state.adapter, visibleEntries)}
          label="Export"
        />
        {state?.adapter.canEdit === true && (
          <IconButton
            name="file-upload"
            color={COLORS.textSecondary}
            onPress={() => setImportOpen(true)}
            label="Import"
          />
        )}
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

      {state && (
        <AddKeySheet adapter={state.adapter} visible={addOpen} onClose={() => setAddOpen(false)} />
      )}

      {state && (
        <ImportSheet
          adapter={state.adapter}
          entries={entries}
          visible={importOpen}
          onClose={() => setImportOpen(false)}
        />
      )}
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
    backgroundColor: COLORS.surface,
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
