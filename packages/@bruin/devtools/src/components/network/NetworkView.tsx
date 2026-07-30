import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo, useState, useSyncExternalStore } from 'react';
import {
  FlatList,
  LayoutAnimation,
  Platform,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

import { DetailPanel } from './DetailPanel';
import { OverviewStrip } from './OverviewStrip';
import { COLORS } from './colors';
import { exportNetworkLog } from './exportNetworkLog';
import { networkLogStore } from '../../utils/network/networkLogStore';
import type { NetworkLogEntry } from '../../utils/network/networkLogStore';
import { classifyResourceType, RESOURCE_TYPE_LABELS } from '../../utils/network/resourceType';
import type { ResourceType } from '../../utils/network/resourceType';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function animateNextLayout() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

const TYPE_FILTERS: ResourceType[] = ['fetch-xhr', 'js', 'img', 'media', 'other'];

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

function IconButton({
  name,
  color,
  onPress,
}: {
  name: MaterialIconName;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} hitSlop={8} style={styles.iconButton}>
      <MaterialIcons name={name} size={19} color={color} />
    </TouchableOpacity>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text style={[styles.chip, active && styles.chipActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function SettingRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={() => onValueChange(!value)}>
      <MaterialIcons
        name={value ? 'check-box' : 'check-box-outline-blank'}
        size={18}
        color={value ? COLORS.accent : COLORS.textSecondary}
      />
      <Text style={styles.settingLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function formatSize(bytes: number | undefined): string {
  if (bytes === undefined) return '–';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Last path segment plus the query string, matching Chrome's "Name" column (used for big rows). */
function getDisplayNameWithQuery(url: string): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const name =
      segments.length > 0 ? decodeURIComponent(segments[segments.length - 1]) : parsed.hostname;
    return parsed.search ? `${name}${parsed.search}` : name;
  } catch {
    return url;
  }
}

function matchesQuery(entry: NetworkLogEntry, query: string): boolean {
  if (!query) return true;
  const haystack =
    `${entry.method} ${entry.url} ${entry.statusCode ?? ''} ${entry.source ?? ''}`.toLowerCase();
  return haystack.includes(query);
}

function LogRow({
  entry,
  bigRows,
  zebra,
  onPress,
}: {
  entry: NetworkLogEntry;
  bigRows: boolean;
  zebra: boolean;
  onPress: () => void;
}) {
  const statusColor =
    entry.status === 'success'
      ? COLORS.success
      : entry.status === 'error'
        ? COLORS.error
        : COLORS.pending;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.row, bigRows && styles.rowBig, zebra && styles.rowZebra]}>
      <View style={styles.rowHeaderLine}>
        <Text style={styles.rowName} numberOfLines={1}>
          {bigRows ? getDisplayNameWithQuery(entry.url) : `${entry.method} ${entry.url}`}
        </Text>
        <Text style={[styles.rowStatus, { color: statusColor }]}>
          {entry.status === 'pending' ? '...' : (entry.statusCode ?? entry.error ?? '')}
        </Text>
        <Text style={styles.rowDuration}>
          {entry.duration !== undefined ? `${entry.duration}ms` : '...'}
        </Text>
      </View>
      {bigRows && (
        <>
          <Text style={styles.rowUrl} numberOfLines={1}>
            {entry.method} {entry.url}
          </Text>
          <View style={styles.rowMetaLine}>
            {entry.source && <Text style={styles.rowMeta}>{entry.source}</Text>}
            <Text style={styles.rowMeta}>
              {RESOURCE_TYPE_LABELS[classifyResourceType(entry.mimeType)]}
            </Text>
            <Text style={styles.rowMeta}>{formatSize(entry.size)}</Text>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

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

  function renderRow(entry: NetworkLogEntry, index: number) {
    return (
      <LogRow
        key={entry.id}
        entry={entry}
        bigRows={bigRows}
        zebra={index % 2 === 1}
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
            {TYPE_FILTERS.map((type) => (
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
          renderItem={({ item, index }) => renderRow(item, index)}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>
              {section.title} ({section.data.length})
            </Text>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No requests captured yet</Text>}
        />
      ) : (
        <FlatList
          data={visibleLogs}
          keyExtractor={(entry) => entry.id}
          renderItem={({ item, index }) => renderRow(item, index)}
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
    backgroundColor: COLORS.background,
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
  iconButton: {
    padding: 4,
  },
  panel: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  settingLabel: {
    fontSize: 13,
    color: COLORS.textPrimary,
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
  chip: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  chipActive: {
    color: '#ffffff',
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  sectionHeader: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.toolbarBackground,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  row: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  rowBig: {
    paddingVertical: 14,
  },
  rowZebra: {
    backgroundColor: '#fafafa',
  },
  rowHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  rowStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  rowDuration: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  rowUrl: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rowMetaLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 3,
  },
  rowMeta: {
    fontSize: 10,
    color: COLORS.accent,
    textTransform: 'uppercase',
  },
  empty: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: 40,
  },
});
