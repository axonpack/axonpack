import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { FlatList, SectionList, Text, useWindowDimensions, View } from 'react-native';

import { DetailPanel } from './detail-panel';
import { FilterPanel } from './filter-panel.component';
import { LogRow } from './log-row.component';
import { OverrideEditor } from './override-editor.component';
import { OverviewStrip, type TimeRange } from './overview-strip.component';
import { SettingsPanel } from './settings-panel.component';
import { SocketDetailPanel } from './socket-detail-panel.component';
import { SocketRow } from './socket-row.component';
import {
  DevtoolsToolbar,
  ToolbarDivider,
} from '../../../core/components/devtools-toolbar.component';
import { IconButton } from '../../../core/components/ui/icon-button.ui';
import { InsetPadding } from '../../../core/components/ui/inset-padding.ui';
import { animateNextLayout } from '../../../core/utils/layout-animation.util';
import { buildMatcher } from '../../../core/utils/text-search.util';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import { replayNitroEntries } from '../services/nitro-fetch.service';
import { networkLogStore } from '../stores/network-log.store';
import type { NetworkEntry, NetworkLogEntry } from '../stores/network-log.store';
import { exportNetworkLog } from '../utils/export-network-log.util';
import {
  compileNetworkFilters,
  DEFAULT_NETWORK_FILTERS,
  hasActiveFilters,
  matchesFilters,
  matchesSocketFilters,
  sortStatusClasses,
  statusClass,
  type NetworkFilters,
} from '../utils/filter-entries.util';
import { formatSource } from '../utils/formatters.util';
import {
  DEFAULT_NETWORK_SORT,
  sortDirectionLabel,
  sortEntries,
  type NetworkSort,
} from '../utils/sort-entries.util';

const SMALL_SCREEN_MAX_WIDTH = 768;

function keyExtractor(entry: NetworkEntry): string {
  return entry.id;
}

export function NetworkView() {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const { width } = useWindowDimensions();
  const logs = useSyncExternalStore(networkLogStore.subscribe, networkLogStore.getMergedSnapshot);
  const paused = useSyncExternalStore(networkLogStore.subscribe, networkLogStore.isPaused);
  const preserveLog = useSyncExternalStore(
    networkLogStore.subscribe,
    networkLogStore.isPreserveLogEnabled
  );

  const [filters, setFilters] = useState<NetworkFilters>(DEFAULT_NETWORK_FILTERS);
  const [sort, setSort] = useState<NetworkSort>(DEFAULT_NETWORK_SORT);
  const [openPanel, setOpenPanel] = useState<'settings' | 'filters' | null>(null);
  const [bigRows, setBigRows] = useState(true);
  const [groupByFetchClient, setGroupByFetchClient] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [activeTimeRange, setActiveTimeRange] = useState<TimeRange | null>(null);
  const [stackedHeaders, setStackedHeaders] = useState(() => width < SMALL_SCREEN_MAX_WIDTH);
  const [selectedEntry, setSelectedEntry] = useState<NetworkEntry | null>(null);
  const [overrideUrl, setOverrideUrl] = useState<string | null>(null);

  const sources = useMemo(() => {
    const seen = new Set<string>();
    for (const entry of logs) {
      if (entry.source) seen.add(entry.source);
    }
    return Array.from(seen);
  }, [logs]);

  const methods = useMemo(() => {
    const seen = new Set<string>();
    for (const entry of logs) seen.add(entry.method);
    return Array.from(seen);
  }, [logs]);

  const statuses = useMemo(() => {
    const seen = new Set<string>();
    for (const entry of logs) {
      if (entry.kind === 'http') seen.add(statusClass(entry));
    }
    return sortStatusClasses(Array.from(seen));
  }, [logs]);

  // One compiled matcher for the whole list — recompiling per row would run it on every keystroke.
  const matcher = useMemo(
    () => buildMatcher({ text: filters.search, ...filters.modes }),
    [filters.search, filters.modes]
  );

  // The status expression and the four thresholds, read once per keystroke rather than once per row.
  const compiled = useMemo(() => compileNetworkFilters(filters), [filters]);

  const overviewLogs = useMemo(
    () =>
      logs.filter((entry) =>
        entry.kind === 'websocket'
          ? matchesSocketFilters(entry, filters, matcher, compiled)
          : matchesFilters(entry, filters, matcher, compiled)
      ),
    [logs, filters, matcher, compiled]
  );

  /** The overview charts durations and status codes, neither of which a socket has. */
  const overviewRequests = useMemo(
    () => overviewLogs.filter((entry): entry is NetworkLogEntry => entry.kind === 'http'),
    [overviewLogs]
  );

  const visibleLogs = useMemo(() => {
    const inRange = activeTimeRange
      ? overviewLogs.filter(
          (entry) =>
            entry.startedAt >= activeTimeRange.start && entry.startedAt <= activeTimeRange.end
        )
      : overviewLogs;
    return sortEntries(inRange, sort);
  }, [overviewLogs, activeTimeRange, sort]);

  const sections = useMemo(() => {
    if (!groupByFetchClient) return [];
    const bySource = new Map<string, NetworkEntry[]>();
    for (const entry of visibleLogs) {
      const key = entry.source ?? 'unknown';
      const list = bySource.get(key) ?? [];
      list.push(entry);
      bySource.set(key, list);
    }
    return Array.from(bySource.entries()).map(([title, data]) => ({ title, data }));
  }, [visibleLogs, groupByFetchClient]);

  function togglePanel(panel: 'settings' | 'filters') {
    animateNextLayout();
    setOpenPanel((current) => (current === panel ? null : panel));
  }

  function patchFilters(patch: Partial<NetworkFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function clearFilters() {
    setFilters(DEFAULT_NETWORK_FILTERS);
    // The overview's brushed range is a filter too, even though it is set from a different surface.
    setActiveTimeRange(null);
  }

  const filtersActive = hasActiveFilters(filters) || activeTimeRange !== null;

  /**
   * The panels and the overview scroll with the rows rather than sitting above them. Pinned, an open
   * filter panel leaves a phone almost no list to look at — and the list is the point of the tab. Same
   * reasoning, and the same shape, as the Storage tab's header.
   *
   * Passed as an element, not as a function: a new function each render is a new component type to
   * `VirtualizedList`, which would remount the header and drop the search box's focus on every
   * keystroke.
   */
  const listHeader = (
    <>
      {openPanel === 'settings' && (
        <SettingsPanel
          bigRows={bigRows}
          onChangeBigRows={setBigRows}
          groupByFetchClient={groupByFetchClient}
          onChangeGroupByFetchClient={setGroupByFetchClient}
          showOverview={showOverview}
          onChangeShowOverview={(value) => {
            setShowOverview(value);
            if (!value) setActiveTimeRange(null);
          }}
          stackedHeaders={stackedHeaders}
          onChangeStackedHeaders={setStackedHeaders}
          sort={sort}
          onChangeSort={setSort}
        />
      )}

      {openPanel === 'filters' && (
        <FilterPanel
          filters={filters}
          compiled={compiled}
          onChange={patchFilters}
          onClear={clearFilters}
          visibleCount={visibleLogs.length}
          totalCount={logs.length}
          statuses={statuses}
          methods={methods}
          sources={sources}
          searchInvalid={matcher?.invalid ?? false}
          filtersActive={filtersActive}
        />
      )}

      {showOverview && (
        <OverviewStrip
          entries={overviewRequests}
          activeRange={activeTimeRange}
          onSelectRange={setActiveTimeRange}
        />
      )}
    </>
  );

  const renderRow = useCallback(
    ({ item }: { item: NetworkEntry }) =>
      item.kind === 'websocket' ? (
        <SocketRow
          entry={item}
          messageCount={networkLogStore.getWebSocketMessages(item.id).length}
          bigRows={bigRows}
          onPress={setSelectedEntry}
        />
      ) : (
        <LogRow
          entry={item}
          bigRows={bigRows}
          matcher={matcher}
          eventCount={
            item.eventStream ? networkLogStore.getStreamEvents(item.id).length : undefined
          }
          onPress={setSelectedEntry}
          onOverride={setOverrideUrl}
        />
      ),
    [bigRows, matcher]
  );

  return (
    <View style={styles.container}>
      <DevtoolsToolbar
        paused={paused}
        onTogglePaused={() => {
          const nextPaused = !paused;
          networkLogStore.setPaused(nextPaused);
          // A JSI client kept recording while this was paused, and nothing here was listening. Reading
          // its buffer on resume is what makes the record button mean the same thing for that traffic
          // as it does for everything else.
          if (!nextPaused) replayNitroEntries();
        }}
        onClear={networkLogStore.clear}
        clearLabel="Clear log">
        <ToolbarDivider />

        <IconButton
          name={sort.descending ? 'arrow-downward' : 'arrow-upward'}
          color={COLORS.textSecondary}
          onPress={() => setSort((current) => ({ ...current, descending: !current.descending }))}
          // What flipping it would give you, in the vocabulary of whatever it is sorting on.
          label={sortDirectionLabel({ ...sort, descending: !sort.descending })}
        />
        <IconButton
          name="filter-list"
          color={openPanel === 'filters' ? COLORS.accent : COLORS.textSecondary}
          active={openPanel === 'filters'}
          onPress={() => togglePanel('filters')}
          label="Filter"
        />

        <ToolbarDivider />

        <IconButton
          name={preserveLog ? 'bookmark' : 'bookmark-border'}
          color={preserveLog ? COLORS.accent : COLORS.textSecondary}
          active={preserveLog}
          onPress={() => networkLogStore.setPreserveLog(!preserveLog)}
          label="Preserve log"
        />

        <ToolbarDivider />

        <IconButton
          name="file-download"
          color={COLORS.textSecondary}
          // Everything the filters left, of every kind — a socket and a stream carry what they
          // recorded, and dropping them was how the export used to lose them.
          onPress={() => exportNetworkLog(visibleLogs)}
          label="Export"
        />
        <IconButton
          name="settings"
          color={openPanel === 'settings' ? COLORS.accent : COLORS.textSecondary}
          active={openPanel === 'settings'}
          onPress={() => togglePanel('settings')}
          label="Settings"
        />
      </DevtoolsToolbar>

      {groupByFetchClient ? (
        <SectionList
          sections={sections}
          keyExtractor={keyExtractor}
          renderItem={renderRow}
          style={styles.list}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader} selectable>
              {formatSource(section.title)} ({section.data.length})
            </Text>
          )}
          contentContainerStyle={styles.listContent}
          contentInsetAdjustmentBehavior="never"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          ListHeaderComponent={listHeader}
          ListEmptyComponent={<Text style={styles.empty}>No requests captured yet</Text>}
          ListFooterComponent=<InsetPadding edge="bottom" />
        />
      ) : (
        <FlatList
          data={visibleLogs}
          keyExtractor={keyExtractor}
          renderItem={renderRow}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          contentInsetAdjustmentBehavior="never"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {logs.length === 0 ? 'No requests captured yet' : 'No requests match your filter'}
            </Text>
          }
          ListFooterComponent=<InsetPadding edge="bottom" />
        />
      )}

      <DetailPanel
        entry={selectedEntry?.kind === 'http' ? selectedEntry : null}
        onClose={() => setSelectedEntry(null)}
        stackedHeaders={stackedHeaders}
      />

      <OverrideEditor url={overrideUrl} onClose={() => setOverrideUrl(null)} />

      <SocketDetailPanel
        entry={selectedEntry?.kind === 'websocket' ? selectedEntry : null}
        onClose={() => setSelectedEntry(null)}
      />
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // The bounded box the rows scroll inside. Without it the list sizes to its own content, and with a
  // panel open the last rows end up past the bottom of the screen rather than scrolling.
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 6,
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
