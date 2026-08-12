import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import {
  FlatList,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import { DetailPanel } from './detail-panel';
import { LogRow } from './log-row.component';
import { OverviewStrip, type TimeRange } from './overview-strip.component';
import { ThrottleSelector } from './throttle-selector.component';
import { UserAgentSelector } from './user-agent-selector.component';
import { COLORS } from '../../constants/colors.const';
import { HIT_SLOP, TOUCH_TARGET } from '../../constants/metrics.const';
import { networkLogStore } from '../../stores/network/network-log.store';
import type { NetworkLogEntry } from '../../stores/network/network-log.store';
import { animateNextLayout } from '../../utils/layout-animation.util';
import { exportNetworkLog } from '../../utils/network/export-network-log.util';
import { matchesQuery } from '../../utils/network/filter-entries.util';
import { formatSource } from '../../utils/network/formatters.util';
import {
  classifyResourceType,
  RESOURCE_TYPE_LABELS,
  RESOURCE_TYPES,
} from '../../utils/network/resource-type.util';
import type { ResourceType } from '../../utils/network/resource-type.util';
import { DevtoolsToolbar, ToolbarDivider } from '../devtools-toolbar.component';
import { Chip } from '../ui/chip.ui';
import { IconButton } from '../ui/icon-button.ui';
import { InsetPadding } from '../ui/inset-padding.ui';
import { SettingRow } from '../ui/setting-row.ui';

const SMALL_SCREEN_MAX_WIDTH = 768;

function keyExtractor(entry: NetworkLogEntry): string {
  return entry.id;
}

export function NetworkView() {
  const { width } = useWindowDimensions();
  const logs = useSyncExternalStore(networkLogStore.subscribe, networkLogStore.getSnapshot);
  const paused = useSyncExternalStore(networkLogStore.subscribe, networkLogStore.isPaused);
  const preserveLog = useSyncExternalStore(
    networkLogStore.subscribe,
    networkLogStore.isPreserveLogEnabled
  );

  const [searchText, setSearchText] = useState('');
  const [invertSearch, setInvertSearch] = useState(false);
  const [hideDataUrls, setHideDataUrls] = useState(false);
  const [hideFailed, setHideFailed] = useState(false);
  const [activeType, setActiveType] = useState<ResourceType | null>(null);
  const [activeMethod, setActiveMethod] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [reversed, setReversed] = useState(false);
  const [openPanel, setOpenPanel] = useState<'settings' | 'filters' | null>(null);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [bigRows, setBigRows] = useState(true);
  const [groupByFetchClient, setGroupByFetchClient] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [activeTimeRange, setActiveTimeRange] = useState<TimeRange | null>(null);
  const [stackedHeaders, setStackedHeaders] = useState(() => width < SMALL_SCREEN_MAX_WIDTH);
  const [selectedEntry, setSelectedEntry] = useState<NetworkLogEntry | null>(null);

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

  // Excludes the overview's time-range filter so the histogram itself always shows the full
  // timeline — selecting a bucket narrows the list below without the strip rescaling under you.
  const overviewLogs = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return logs.filter((entry) => {
      if (hideDataUrls && entry.url.startsWith('data:')) return false;
      if (hideFailed && entry.status === 'error') return false;
      if (activeSource !== null && entry.source !== activeSource) return false;
      if (activeMethod !== null && entry.method !== activeMethod) return false;
      if (activeType !== null && classifyResourceType(entry.mimeType) !== activeType) return false;

      const matches = matchesQuery(entry, query);
      return invertSearch ? !matches : matches;
    });
  }, [
    logs,
    searchText,
    invertSearch,
    hideDataUrls,
    hideFailed,
    activeSource,
    activeMethod,
    activeType,
  ]);

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
    const bySource = new Map<string, NetworkLogEntry[]>();
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

  // Held across renders, and LogRow hands the entry back rather than being closed over — so all 200 rows
  // share one callback and the row's `memo` actually holds. Rebuilt only when the row size changes.
  const renderRow = useCallback(
    ({ item }: { item: NetworkLogEntry }) => (
      <LogRow entry={item} bigRows={bigRows} onPress={setSelectedEntry} />
    ),
    [bigRows]
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
            <Chip label="Invert" active={invertSearch} onPress={() => setInvertSearch((c) => !c)} />
          </View>

          <Text style={styles.filterSectionLabel}>Type</Text>
          <View style={styles.chipsRow}>
            <Chip label="All" active={activeType === null} onPress={() => setActiveType(null)} />
            {RESOURCE_TYPES.map((type) => (
              <Chip
                key={type}
                label={RESOURCE_TYPE_LABELS[type]}
                active={activeType === type}
                onPress={() => setActiveType(type)}
              />
            ))}
          </View>

          {methods.length > 0 && (
            <>
              <Text style={styles.filterSectionLabel}>Method</Text>
              <View style={styles.chipsRow}>
                <Chip
                  label="All"
                  active={activeMethod === null}
                  onPress={() => setActiveMethod(null)}
                />
                {methods.map((method) => (
                  <Chip
                    key={method}
                    label={method}
                    active={activeMethod === method}
                    onPress={() => setActiveMethod(method)}
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
                  active={activeSource === null}
                  onPress={() => setActiveSource(null)}
                />
                {sources.map((source) => (
                  <Chip
                    key={source}
                    label={formatSource(source)}
                    active={activeSource === source}
                    onPress={() => setActiveSource(source)}
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
                value={hideDataUrls}
                onValueChange={setHideDataUrls}
              />
              <SettingRow
                label="Hide failed requests"
                value={hideFailed}
                onValueChange={setHideFailed}
              />
            </View>
          )}
        </View>
      )}

      {showOverview && (
        <OverviewStrip
          entries={overviewLogs}
          activeRange={activeTimeRange}
          onSelectRange={setActiveTimeRange}
        />
      )}

      {groupByFetchClient ? (
        <SectionList
          sections={sections}
          keyExtractor={keyExtractor}
          renderItem={renderRow}
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
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
        stackedHeaders={stackedHeaders}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  // The settings panel outgrew the screen once throttling and user-agent moved in — cap it so the
  // request list underneath stays visible instead of being pushed off.
  scrollablePanel: {
    flexGrow: 0,
    maxHeight: 320,
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
  // Dense rather than full-size, so the glyph stays centred in the field instead of stretching it; the
  // row's own 44dp height is what makes the slop above reachable on Android.
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
});
