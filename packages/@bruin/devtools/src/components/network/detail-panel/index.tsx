import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { HeadersTab } from './headers-tab.component';
import { PayloadTab } from './payload-tab.component';
import { PreviewTab } from './preview-tab.component';
import { ResponseTab } from './response-tab.component';
import { TimingTab } from './timing-tab.component';
import { COLORS } from '../../../constants/colors.const';
import type { NetworkLogEntry } from '../../../stores/network/network-log.store';
import { buildCurlCommand } from '../../../utils/network/curl.util';
import {
  buildFetchCommand,
  buildNodeFetchCommand,
} from '../../../utils/network/fetch-snippet.util';
import { BottomSheet } from '../../ui/bottom-sheet.ui';
import { ContextMenu, type ContextMenuItem } from '../../ui/context-menu.ui';
import { IconButton } from '../../ui/icon-button.ui';
import { SparkleIcon } from '../../ui/sparkle-icon.ui';
import { SandboxSheet } from '../sandbox';

type Tab = 'headers' | 'payload' | 'preview' | 'response' | 'timing';

const TABS: { key: Tab; label: string }[] = [
  { key: 'headers', label: 'Headers' },
  { key: 'payload', label: 'Payload' },
  { key: 'preview', label: 'Preview' },
  { key: 'response', label: 'Response' },
  { key: 'timing', label: 'Timing' },
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
  const [tab, setTab] = useState<Tab>('headers');
  const [renderedEntry, setRenderedEntry] = useState<NetworkLogEntry | null>(null);
  const [prevEntry, setPrevEntry] = useState<NetworkLogEntry | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null);
  const [sandboxOpen, setSandboxOpen] = useState(false);

  // Adjust state during render when `entry` changes, rather than mirroring it via an effect
  // (see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  if (entry !== prevEntry) {
    setPrevEntry(entry);
    if (entry) {
      setRenderedEntry(entry);
      setTab('headers');
      setSandboxOpen(false);
    }
  }

  // Keeps rendering the last entry while BottomSheet plays its close animation, rather than
  // the content disappearing the instant `entry` goes null.
  const active = entry ?? renderedEntry;
  if (!active) return null;

  const menuItems: ContextMenuItem[] = [
    {
      label: 'Try in sandbox',
      icon: <SparkleIcon />,
      onPress: () => setSandboxOpen(true),
    },
    { label: 'Copy URL', onPress: () => Clipboard.setStringAsync(active.url) },
    { label: 'Copy as cURL', onPress: () => Clipboard.setStringAsync(buildCurlCommand(active)) },
    { label: 'Copy as fetch', onPress: () => Clipboard.setStringAsync(buildFetchCommand(active)) },
    {
      label: 'Copy as fetch (Node.js)',
      onPress: () => Clipboard.setStringAsync(buildNodeFetchCommand(active)),
    },
    ...(active.requestBody
      ? [
          {
            label: 'Copy request payload',
            onPress: () => Clipboard.setStringAsync(active.requestBody as string),
          },
        ]
      : []),
    ...(active.responseBody
      ? [
          {
            label: 'Copy response',
            onPress: () => Clipboard.setStringAsync(active.responseBody as string),
          },
        ]
      : []),
  ];

  return (
    <>
      <BottomSheet visible={entry !== null} onClose={onClose}>
        <View style={styles.tabBarRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabBar}
            contentContainerStyle={styles.tabBarContent}>
            {TABS.filter((t) => t.key !== 'payload' || active.requestBody).map((t) => (
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

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {tab === 'headers' && <HeadersTab entry={active} stackedHeaders={stackedHeaders} />}
          {tab === 'payload' && <PayloadTab entry={active} />}
          {tab === 'preview' && <PreviewTab entry={active} />}
          {tab === 'response' && <ResponseTab entry={active} />}
          {tab === 'timing' && <TimingTab entry={active} />}
        </ScrollView>

        <ContextMenu anchor={menuAnchor} items={menuItems} onClose={() => setMenuAnchor(null)} />
      </BottomSheet>
      <SandboxSheet visible={sandboxOpen} entry={active} onClose={() => setSandboxOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  tabBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  tabBar: {
    flex: 1,
  },
  tabBarContent: {
    flexDirection: 'row',
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
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
  content: {
    flexGrow: 0,
  },
  contentContainer: {
    padding: 12,
    paddingBottom: 24,
  },
});
