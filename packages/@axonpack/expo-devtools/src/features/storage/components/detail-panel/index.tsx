import { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { EditTab } from './edit-tab.component';
import { InfoTab } from './info-tab.component';
import { RawTab } from './raw-tab.component';
import { useDetailStyles } from './shared.styles';
import { ValueTab } from './value-tab.component';
import { BottomSheet } from '../../../../core/components/ui/bottom-sheet.ui';
import { ContextMenu, type ContextMenuItem } from '../../../../core/components/ui/context-menu.ui';
import { IconButton } from '../../../../core/components/ui/icon-button.ui';
import { InsetPadding } from '../../../../core/components/ui/inset-padding.ui';
import { SearchInput } from '../../../../core/components/ui/search-input.ui';
import { HIT_SLOP, TOUCH_TARGET } from '../../../../core/constants/metrics.const';
import {
  buildMatcher,
  DEFAULT_SEARCH_MODES,
  MAX_SEARCHABLE_LENGTH,
  type SearchModes,
} from '../../../../core/utils/text-search.util';
import { makeThemedStyles, useThemeColors } from '../../../../core/utils/themed-styles.util';
import { removeStorageKey } from '../../services/write-storage.service';
import type { StorageAdapterState, StorageEntry } from '../../stores/storage.store';
import { buildStorageCopyMenuItems } from '../../utils/entry-menu-items.util';

type Tab = 'value' | 'raw' | 'edit' | 'info';

const TABS: { key: Tab; label: string }[] = [
  { key: 'value', label: 'Value' },
  { key: 'raw', label: 'Raw' },
  { key: 'edit', label: 'Edit' },
  { key: 'info', label: 'Info' },
];

export function DetailPanel({
  entry,
  state,
  onClose,
}: {
  entry: StorageEntry | null;
  state: StorageAdapterState | undefined;
  onClose: () => void;
}) {
  const styles = useStyles();
  const detailStyles = useDetailStyles();
  const COLORS = useThemeColors();

  const [tab, setTab] = useState<Tab>('value');
  const [renderedEntry, setRenderedEntry] = useState<StorageEntry | null>(null);
  const [prevEntry, setPrevEntry] = useState<StorageEntry | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null);
  const [search, setSearch] = useState('');
  const [searchModes, setSearchModes] = useState<SearchModes>(DEFAULT_SEARCH_MODES);

  const matcher = useMemo(
    () => buildMatcher({ text: search, ...searchModes }),
    [search, searchModes]
  );

  // Keeps the last entry rendered while the sheet slides out, so it doesn't blank mid-animation.
  if (entry !== prevEntry) {
    setPrevEntry(entry);
    if (entry && entry.key !== renderedEntry?.key) {
      setTab('value');
      setSearch('');
    }
    if (entry) setRenderedEntry(entry);
  }

  const active = entry ?? renderedEntry;
  if (!active || !state) return null;

  const { adapter } = state;
  const searchable = tab === 'value' || tab === 'raw';
  const bodyTooLarge = (active.text?.length ?? 0) > MAX_SEARCHABLE_LENGTH;

  // An arrow rather than a declaration: a hoisted function loses the non-null narrowing above.
  const confirmDelete = () => {
    Alert.alert('Delete key?', `"${active.key}" will be removed from ${adapter.name}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const message = await removeStorageKey(active);
          if (message === null) onClose();
          else Alert.alert('Could not delete', message);
        },
      },
    ]);
  };

  const menuItems: ContextMenuItem[] = [
    ...buildStorageCopyMenuItems(active),
    ...(adapter.canDelete ? [{ label: 'Delete key', onPress: confirmDelete }] : []),
  ];

  return (
    <BottomSheet
      visible={entry !== null}
      onClose={onClose}
      headerContent={
        <View style={styles.tabBarRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabBar}
            automaticallyAdjustKeyboardInsets
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.tabBarContent}>
            {TABS.map((current) => (
              <TouchableOpacity
                key={current.key}
                onPress={() => setTab(current.key)}
                style={[styles.tabButton, tab === current.key && styles.tabButtonActive]}>
                <Text style={[styles.tabLabel, tab === current.key && styles.tabLabelActive]}>
                  {current.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <IconButton
            name="more-vert"
            color={COLORS.textSecondary}
            hitSlop={HIT_SLOP.default}
            onPress={(event) =>
              setMenuAnchor({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY })
            }
          />
        </View>
      }>
      <View style={styles.keyRow}>
        <Text style={styles.keyLabel} selectable>
          {active.key}
        </Text>
      </View>

      {searchable && active.text !== null && (
        // Outside the ScrollView so it stays put while the value scrolls under it.
        <View style={styles.searchBar}>
          <SearchInput
            value={search}
            onChangeText={setSearch}
            modes={searchModes}
            onModesChange={setSearchModes}
            placeholder="Search this value"
            invalid={matcher?.invalid ?? false}
          />
          {bodyTooLarge && search.length > 0 && (
            <Text style={detailStyles.note}>
              Value is over {MAX_SEARCHABLE_LENGTH.toLocaleString()} characters — too large to
              highlight
            </Text>
          )}
        </View>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive">
        <View>
          {tab === 'value' && <ValueTab entry={active} matcher={matcher} />}
          {tab === 'raw' && <RawTab entry={active} matcher={matcher} />}
          {tab === 'edit' && <EditTab entry={active} adapter={adapter} />}
          {tab === 'info' && <InfoTab entry={active} adapter={adapter} state={state} />}
          <InsetPadding edge="bottom" />
        </View>
      </ScrollView>

      <ContextMenu anchor={menuAnchor} items={menuItems} onClose={() => setMenuAnchor(null)} />
    </BottomSheet>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  tabBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabBar: {
    flex: 1,
  },
  tabBarContent: {
    flexDirection: 'row',
  },
  tabButton: {
    minHeight: TOUCH_TARGET.min,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: COLORS.accent,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabLabelActive: {
    color: COLORS.accent,
  },
  keyRow: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  keyLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  searchBar: {
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  content: {
    flexGrow: 0,
  },
  contentContainer: {
    padding: 12,
    paddingBottom: 24,
  },
}));
