import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import {
  FlatList,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import { DetailPanel } from './detail-panel';
import { LogRow } from './log-row.component';
import { OverrideEditor } from './override-editor.component';
import { OverviewStrip, type TimeRange } from './overview-strip.component';
import { SocketDetailPanel } from './socket-detail-panel.component';
import { SocketRow } from './socket-row.component';
import { ThrottleSelector } from './throttle-selector.component';
import { UserAgentSelector } from './user-agent-selector.component';
import {
  DevtoolsToolbar,
  ToolbarDivider,
} from '../../../core/components/devtools-toolbar.component';
import { Chip } from '../../../core/components/ui/chip.ui';
import { IconButton } from '../../../core/components/ui/icon-button.ui';
import { InsetPadding } from '../../../core/components/ui/inset-padding.ui';
import { SearchInput } from '../../../core/components/ui/search-input.ui';
import { SettingRow } from '../../../core/components/ui/setting-row.ui';
import { HIT_SLOP, TOUCH_TARGET } from '../../../core/constants/metrics.const';
import { animateNextLayout } from '../../../core/utils/layout-animation.util';
import { buildMatcher } from '../../../core/utils/text-search.util';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import { networkLogStore } from '../stores/network-log.store';
import type { NetworkEntry, NetworkLogEntry } from '../stores/network-log.store';
import { exportNetworkLog } from '../utils/export-network-log.util';
import {
  DEFAULT_NETWORK_FILTERS,
  hasActiveFilters,
  matchesFilters,
  matchesSocketFilters,
  sortStatusClasses,
  statusClass,
  statusClassLabel,
  type NetworkFilters,
} from '../utils/filter-entries.util';
import { formatSource } from '../utils/formatters.util';
import { RESOURCE_TYPE_LABELS, RESOURCE_TYPES } from '../utils/resource-type.util';

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
  const [reversed, setReversed] = useState(false);
  const [openPanel, setOpenPanel] = useState<'settings' | 'filters' | null>(null);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
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

  const overviewLogs = useMemo(
    () =>
      logs.filter((entry) =>
        entry.kind === 'websocket'
          ? matchesSocketFilters(entry, filters, matcher)
          : matchesFilters(entry, filters, matcher)
      ),
    [logs, filters, matcher]
  );

  /** The overview charts durations and status codes, neither of which a socket has. */
  const overviewRequests = useMemo(
    () => overviewLogs.filter((entry): entry is NetworkLogEntry => entry.kind === 'http'),
    [overviewLogs]
  );

  const visibleLogs = useMemo(() => {
    let result = activeTimeRange
      ? overviewLogs.filter(
          (entry) =>
            entry.startedAt >= activeTimeRange.start && entry.startedAt <= activeTimeRange.end
        )
      : overviewLogs;
    if (reversed) {
      result = [...result].reverse();
    }
    return result;
  }, [overviewLogs, activeTimeRange, reversed]);

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

  function toggleMoreFilters() {
    animateNextLayout();
    setMoreFiltersOpen((current) => !current);
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
        onTogglePaused={() => networkLogStore.setPaused(!paused)}
        onClear={networkLogStore.clear}
        clearLabel="Clear log">
        <ToolbarDivider />

        <IconButton
          name={reversed ? 'arrow-upward' : 'arrow-downward'}
          color={COLORS.textSecondary}
          onPress={() => setReversed((c) => !c)}
          label={reversed ? 'Show oldest first' : 'Show newest first'}
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
          onPress={() => exportNetworkLog(visibleLogs.filter((e) => e.kind === 'http'))}
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

      {openPanel === 'settings' && (
        <ScrollView style={styles.scrollablePanel} contentContainerStyle={styles.panel}>
          <SettingRow label="Large request rows" value={bigRows} onValueChange={setBigRows} />
          <SettingRow
            label="Group by fetch client"
            value={groupByFetchClient}
            onValueChange={setGroupByFetchClient}
          />
          <SettingRow
            label="Show overview"
            value={showOverview}
            onValueChange={(value) => {
              setShowOverview(value);
              if (!value) setActiveTimeRange(null);
            }}
          />
          <SettingRow
            label="Stack header values"
            value={stackedHeaders}
            onValueChange={setStackedHeaders}
          />
          <ThrottleSelector />
          <UserAgentSelector />
        </ScrollView>
      )}

      {openPanel === 'filters' && (
        <View style={styles.panel}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterCount}>
              {visibleLogs.length} of {logs.length}
            </Text>
            <Chip
              label="Invert"
              active={filters.invert}
              onPress={() => patchFilters({ invert: !filters.invert })}
            />
            <TouchableOpacity
              onPress={clearFilters}
              disabled={!filtersActive}
              hitSlop={HIT_SLOP.default}
              accessibilityLabel="Clear all filters"
              style={styles.clearFilters}>
              <Text style={[styles.clearFiltersLabel, !filtersActive && styles.clearFiltersOff]}>
                Clear
              </Text>
            </TouchableOpacity>
          </View>

          <SearchInput
            value={filters.search}
            onChangeText={(search) => patchFilters({ search })}
            modes={filters.modes}
            onModesChange={(modes) => patchFilters({ modes })}
            invalid={matcher?.invalid ?? false}
          />

          <Text style={styles.filterSectionLabel}>Type</Text>
          <View style={styles.chipsRow}>
            <Chip
              label="All"
              active={filters.type === null}
              onPress={() => patchFilters({ type: null })}
            />
            {RESOURCE_TYPES.map((type) => (
              <Chip
                key={type}
                label={RESOURCE_TYPE_LABELS[type]}
                active={filters.type === type}
                onPress={() => patchFilters({ type })}
              />
            ))}
          </View>

          {statuses.length > 0 && (
            <>
              <Text style={styles.filterSectionLabel}>Status</Text>
              <View style={styles.chipsRow}>
                <Chip
                  label="All"
                  active={filters.status === null}
                  onPress={() => patchFilters({ status: null })}
                />
                {statuses.map((status) => (
                  <Chip
                    key={status}
                    label={statusClassLabel(status)}
                    active={filters.status === status}
                    onPress={() => patchFilters({ status })}
                  />
                ))}
              </View>
            </>
          )}

          {methods.length > 0 && (
            <>
              <Text style={styles.filterSectionLabel}>Method</Text>
              <View style={styles.chipsRow}>
                <Chip
                  label="All"
                  active={filters.method === null}
                  onPress={() => patchFilters({ method: null })}
                />
                {methods.map((method) => (
                  <Chip
                    key={method}
                    label={method}
                    active={filters.method === method}
                    onPress={() => patchFilters({ method })}
                  />
                ))}
              </View>
            </>
          )}

          {sources.length > 0 && (
            <>
              <Text style={styles.filterSectionLabel}>Source</Text>
              <View style={styles.chipsRow}>
                <Chip
                  label="All"
                  active={filters.source === null}
                  onPress={() => patchFilters({ source: null })}
                />
                {sources.map((source) => (
                  <Chip
                    key={source}
                    label={formatSource(source)}
                    active={filters.source === source}
                    onPress={() => patchFilters({ source })}
                  />
                ))}
              </View>
            </>
          )}

          <TouchableOpacity onPress={toggleMoreFilters}>
            <Text style={styles.moreFiltersToggle}>
              {moreFiltersOpen ? 'Hide more filters' : 'More filters'}
            </Text>
          </TouchableOpacity>

          {moreFiltersOpen && (
            <View>
              <SettingRow
                label="Hide data URLs"
                value={filters.hideDataUrls}
                onValueChange={(hideDataUrls) => patchFilters({ hideDataUrls })}
              />
              <SettingRow
                label="Hide failed requests"
                value={filters.hideFailed}
                onValueChange={(hideFailed) => patchFilters({ hideFailed })}
              />
            </View>
          )}
        </View>
      )}

      {showOverview && (
        <OverviewStrip
          entries={overviewRequests}
          activeRange={activeTimeRange}
          onSelectRange={setActiveTimeRange}
        />
      )}

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
  panel: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },

  scrollablePanel: {
    flexGrow: 0,
    maxHeight: 320,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  filterCount: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  clearFilters: {
    minHeight: TOUCH_TARGET.dense,
    justifyContent: 'center',
  },
  clearFiltersLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },
  clearFiltersOff: {
    color: COLORS.textSecondary,
    opacity: 0.5,
  },
  moreFiltersToggle: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '600',
    marginTop: 10,
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
