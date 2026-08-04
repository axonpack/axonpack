import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  FlatList,
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
import { COLORS } from '../../constants/colors.const';
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
import { Chip } from '../ui/chip.ui';
import { IconButton } from '../ui/icon-button.ui';
import { InsetPadding } from '../ui/inset-padding.ui';
import { RecordToggleIcon } from '../ui/record-toggle-icon.ui';
import { SettingRow } from '../ui/setting-row.ui';
import { Tooltip } from '../ui/tooltip.ui';

const SMALL_SCREEN_MAX_WIDTH = 768;

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
  const [recordToggleTooltipAnchor, setRecordToggleTooltipAnchor] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const suppressNextRecordTogglePress = useRef(false);

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

  function renderRow(entry: NetworkLogEntry) {
    return (
      <LogRow
        key={entry.id}
        entry={entry}
        bigRows={bigRows}
        onPress={() => setSelectedEntry(entry)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => {
              if (suppressNextRecordTogglePress.current) {
                suppressNextRecordTogglePress.current = false;
                return;
              }
              networkLogStore.setPaused(!paused);
            }}
            onLongPress={(event) => {
              suppressNextRecordTogglePress.current = true;
              setRecordToggleTooltipAnchor({
                x: event.nativeEvent.pageX,
                y: event.nativeEvent.pageY,
              });
            }}
            onPressOut={() => setRecordToggleTooltipAnchor(null)}
            hitSlop={8}
            style={[styles.recordToggle, paused && styles.recordToggleActive]}>
            <RecordToggleIcon
              size={18}
              color={paused ? COLORS.textSecondary : COLORS.error}
              shape={paused ? 'circle' : 'square'}
            />
          </TouchableOpacity>
          <Tooltip
            anchor={recordToggleTooltipAnchor}
            label={paused ? 'Start recording' : 'Stop recording'}
            onClose={() => setRecordToggleTooltipAnchor(null)}
          />
          <IconButton
            name="block"
            color={COLORS.textSecondary}
            onPress={networkLogStore.clear}
            label="Clear log"
          />

          <View style={styles.headerDivider} />

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

          <View style={styles.headerDivider} />

          <IconButton
            name={preserveLog ? 'bookmark' : 'bookmark-border'}
            color={preserveLog ? COLORS.accent : COLORS.textSecondary}
            active={preserveLog}
            onPress={() => networkLogStore.setPreserveLog(!preserveLog)}
            label="Preserve log"
          />

          <View style={styles.headerDivider} />

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
        </View>
      </View>

      {openPanel === 'settings' && (
        <View style={styles.panel}>
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
        </View>
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
              <TouchableOpacity onPress={() => setSearchText('')} hitSlop={8}>
                <MaterialIcons name="close" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
            <Chip label="Invert" active={invertSearch} onPress={() => setInvertSearch((c) => !c)} />
          </View>

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
          keyExtractor={(entry) => entry.id}
          renderItem={({ item }) => renderRow(item)}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader} selectable>
              {formatSource(section.title)} ({section.data.length})
            </Text>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.empty}>No requests captured yet</Text>}
          ListFooterComponent={<InsetPadding edge="bottom" />}
        />
      ) : (
        <FlatList
          data={visibleLogs}
          keyExtractor={(entry) => entry.id}
          renderItem={({ item }) => renderRow(item)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {logs.length === 0 ? 'No requests captured yet' : 'No requests match your filter'}
            </Text>
          }
          ListFooterComponent={<InsetPadding edge="bottom" />}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  recordToggle: {
    padding: 4,
    borderRadius: 8,
  },
  recordToggleActive: {
    backgroundColor: COLORS.sectionTint,
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
