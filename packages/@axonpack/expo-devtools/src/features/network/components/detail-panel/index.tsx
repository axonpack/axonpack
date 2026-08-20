import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { HeadersTab } from './headers-tab.component';
import { InitiatorTab } from './initiator-tab.component';
import { PayloadTab } from './payload-tab.component';
import { PreviewTab } from './preview-tab.component';
import { ResponseTab } from './response-tab.component';
import { TimingTab } from './timing-tab.component';
import { BottomSheet } from '../../../../core/components/ui/bottom-sheet.ui';
import { ContextMenu, type ContextMenuItem } from '../../../../core/components/ui/context-menu.ui';
import { IconButton } from '../../../../core/components/ui/icon-button.ui';
import { InsetPadding } from '../../../../core/components/ui/inset-padding.ui';
import { SearchInput } from '../../../../core/components/ui/search-input.ui';
import { SparkleIcon } from '../../../../core/components/ui/sparkle-icon.ui';
import { TOUCH_TARGET } from '../../../../core/constants/metrics.const';
import {
  buildMatcher,
  DEFAULT_SEARCH_MODES,
  MAX_SEARCHABLE_LENGTH,
  type SearchModes,
} from '../../../../core/utils/text-search.util';
import { makeThemedStyles, useThemeColors } from '../../../../core/utils/themed-styles.util';
import type { NetworkLogEntry } from '../../stores/network-log.store';
import { buildEntryCopyMenuItems } from '../../utils/entry-menu-items.util';
import { classifyPreview } from '../../utils/preview-kind.util';
import { SandboxSheet } from '../sandbox';

type Tab = 'headers' | 'payload' | 'preview' | 'response' | 'timing' | 'initiator';

const TABS: { key: Tab; label: string }[] = [
  { key: 'headers', label: 'Headers' },
  { key: 'payload', label: 'Payload' },
  { key: 'preview', label: 'Preview' },
  { key: 'response', label: 'Response' },
  { key: 'timing', label: 'Timing' },
  { key: 'initiator', label: 'Initiator' },
];

export function DetailPanel({
  entry,
  onClose,
  stackedHeaders,
}: {
  entry: NetworkLogEntry | null;
  onClose: () => void;
  stackedHeaders: boolean;
}) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const [tab, setTab] = useState<Tab>('headers');
  const [renderedEntry, setRenderedEntry] = useState<NetworkLogEntry | null>(null);
  const [prevEntry, setPrevEntry] = useState<NetworkLogEntry | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null);
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchModes, setSearchModes] = useState<SearchModes>(DEFAULT_SEARCH_MODES);

  const matcher = useMemo(
    () => buildMatcher({ text: search, ...searchModes }),
    [search, searchModes]
  );

  if (entry !== prevEntry) {
    setPrevEntry(entry);
    if (entry) {
      setRenderedEntry(entry);
      setTab('headers');
      setSandboxOpen(false);
    }
  }

  const active = entry ?? renderedEntry;
  if (!active) return null;

  const searchedBody = tab === 'payload' ? active.requestBody : active.responseBody;
  const searchable =
    Boolean(searchedBody) &&
    (tab === 'payload' ||
      tab === 'response' ||
      (tab === 'preview' && classifyPreview(active.mimeType) === 'text'));
  const bodyTooLarge = (searchedBody?.length ?? 0) > MAX_SEARCHABLE_LENGTH;

  const menuItems: ContextMenuItem[] = [
    {
      label: 'Try in sandbox',
      icon: <SparkleIcon />,
      onPress: () => setSandboxOpen(true),
    },
    ...buildEntryCopyMenuItems(active),
  ];

  return (
    <>
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
              automaticallyAdjustsScrollIndicatorInsets
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              contentContainerStyle={styles.tabBarContent}>
              {TABS.filter(
                (t) =>
                  (t.key !== 'payload' || active.requestBody) &&
                  (t.key !== 'initiator' || active.initiator?.length)
              ).map((t) => (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  style={[styles.tabButton, tab === t.key && styles.tabButtonActive]}>
                  <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <IconButton
              name="more-vert"
              color={COLORS.textSecondary}
              hitSlop={12}
              onPress={(event) =>
                setMenuAnchor({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY })
              }
            />
          </View>
        }>
        {searchable && (
          // Outside the ScrollView so it stays put while the body scrolls under it.
          <View style={styles.searchBar}>
            <SearchInput
              value={search}
              onChangeText={setSearch}
              modes={searchModes}
              onModesChange={setSearchModes}
              placeholder="Search this body"
              invalid={matcher?.invalid ?? false}
            />
            {bodyTooLarge && search.length > 0 && (
              <Text style={styles.searchNote}>
                Body is over {MAX_SEARCHABLE_LENGTH.toLocaleString()} characters — too large to
                highlight
              </Text>
            )}
          </View>
        )}

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          automaticallyAdjustKeyboardInsets
          automaticallyAdjustsScrollIndicatorInsets
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive">
          <View>
            {tab === 'headers' && <HeadersTab entry={active} stackedHeaders={stackedHeaders} />}
            {tab === 'payload' && <PayloadTab entry={active} matcher={matcher} />}
            {tab === 'preview' && <PreviewTab entry={active} matcher={matcher} />}
            {tab === 'response' && <ResponseTab entry={active} matcher={matcher} />}
            {tab === 'timing' && <TimingTab entry={active} />}
            {tab === 'initiator' && <InitiatorTab entry={active} />}
            <InsetPadding edge="bottom" />
          </View>
        </ScrollView>

        <ContextMenu anchor={menuAnchor} items={menuItems} onClose={() => setMenuAnchor(null)} />
      </BottomSheet>
      <SandboxSheet visible={sandboxOpen} entry={active} onClose={() => setSandboxOpen(false)} />
    </>
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
  searchBar: {
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  searchNote: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  content: {
    flexGrow: 0,
  },
  contentContainer: {
    padding: 12,
    paddingBottom: 24,
  },
}));
