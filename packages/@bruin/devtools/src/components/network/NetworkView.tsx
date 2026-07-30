import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo, useState, useSyncExternalStore } from 'react';
import {
  FlatList,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Chip } from './Chip';
import { DetailPanel } from './DetailPanel';
import { IconButton } from './IconButton';
import { LogRow } from './LogRow';
import { OverviewStrip } from './OverviewStrip';
import { SettingRow } from './SettingRow';
import { COLORS } from './colors';
import { exportNetworkLog } from './exportNetworkLog';
import { matchesQuery } from './filterEntries';
import { animateNextLayout } from './layoutAnimation';
import { networkLogStore } from '../../utils/network/networkLogStore';
import type { NetworkLogEntry } from '../../utils/network/networkLogStore';
import {
  classifyResourceType,
  RESOURCE_TYPE_LABELS,
  RESOURCE_TYPES,
} from '../../utils/network/resourceType';
import type { ResourceType } from '../../utils/network/resourceType';

export function NetworkView() {
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

  const visibleLogs = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    let result = logs.filter((entry) => {
      if (hideDataUrls && entry.url.startsWith('data:')) return false;
      if (hideFailed && entry.status === 'error') return false;
      if (activeSource !== null && entry.source !== activeSource) return false;
      if (activeMethod !== null && entry.method !== activeMethod) return false;
      if (activeType !== null && classifyResourceType(entry.mimeType) !== activeType) return false;

      const matches = matchesQuery(entry, query);
      return invertSearch ? !matches : matches;
    });
    if (reversed) {
      result = [...result].reverse();
    }
    return result;
  }, [
    logs,
    searchText,
    invertSearch,
    hideDataUrls,
    hideFailed,
    activeSource,
    activeMethod,
    activeType,
    reversed,
  ]);

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
          <IconButton
            name={paused ? 'radio-button-unchecked' : 'fiber-manual-record'}
            color={paused ? COLORS.textSecondary : COLORS.error}
            onPress={() => networkLogStore.setPaused(!paused)}
          />
          <IconButton
            name="swap-vert"
            color={COLORS.textSecondary}
            onPress={() => setReversed((c) => !c)}
          />
          <IconButton name="block" color={COLORS.textSecondary} onPress={networkLogStore.clear} />
          <IconButton
            name={preserveLog ? 'bookmark' : 'bookmark-border'}
            color={preserveLog ? COLORS.accent : COLORS.textSecondary}
            onPress={() => networkLogStore.setPreserveLog(!preserveLog)}
          />
          <IconButton
            name="file-download"
            color={COLORS.textSecondary}
            onPress={() => exportNetworkLog(visibleLogs)}
          />
          <IconButton
            name="settings"
            color={openPanel === 'settings' ? COLORS.accent : COLORS.textSecondary}
            onPress={() => togglePanel('settings')}
          />
          <IconButton
            name="filter-list"
            color={openPanel === 'filters' ? COLORS.accent : COLORS.textSecondary}
            onPress={() => togglePanel('filters')}
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
          <SettingRow label="Show overview" value={showOverview} onValueChange={setShowOverview} />
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
                    label={source}
                    active={activeSource === source}
                    onPress={() => setActiveSource(source)}
                  />
                ))}
              </View>
            </>
          )}
        </View>
      )}

      {showOverview && <OverviewStrip entries={visibleLogs} />}

      {groupByFetchClient ? (
        <SectionList
          sections={sections}
          keyExtractor={(entry) => entry.id}
          renderItem={({ item }) => renderRow(item)}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader} selectable>
              {section.title} ({section.data.length})
            </Text>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.empty}>No requests captured yet</Text>}
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
        />
      )}

      <DetailPanel entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.toolbarBackground,
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
    backgroundColor: COLORS.toolbarBackground,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 2,
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
