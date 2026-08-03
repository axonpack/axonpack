import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { HeadersTab } from './headers-tab.component';
import { PayloadTab } from './payload-tab.component';
import { PreviewTab } from './preview-tab.component';
import { ResponseTab } from './response-tab.component';
import { TimingTab } from './timing-tab.component';
import { COLORS } from '../../../constants/colors.const';
import type { NetworkLogEntry } from '../../../stores/network/network-log.store';

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
  const [translateY] = useState(() => new Animated.Value(400));
  const [tab, setTab] = useState<Tab>('headers');
  const [renderedEntry, setRenderedEntry] = useState<NetworkLogEntry | null>(null);
  const [prevEntry, setPrevEntry] = useState<NetworkLogEntry | null>(null);

  // Adjust state during render when `entry` changes, rather than mirroring it via an effect
  // (see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  if (entry !== prevEntry) {
    setPrevEntry(entry);
    if (entry) {
      setRenderedEntry(entry);
      setTab('headers');
    }
  }

  useEffect(() => {
    if (entry) {
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    } else {
      Animated.timing(translateY, { toValue: 400, duration: 180, useNativeDriver: true }).start(
        () => {
          setRenderedEntry(null);
        }
      );
    }
  }, [entry, translateY]);

  if (!entry && !renderedEntry) return null;
  const active = entry ?? renderedEntry;
  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TouchableOpacity
        style={[StyleSheet.absoluteFill, styles.backdrop]}
        activeOpacity={1}
        onPress={onClose}
      />
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.sheetHeader}>
          <View style={styles.sheetHandle} />
          <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.closeButton}>
            <MaterialIcons name="close" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.tabBar}>
          {TABS.filter((t) => t.key !== 'payload' || active.requestBody).map((t) => (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={styles.tabButton}>
              <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {tab === 'headers' && <HeadersTab entry={active} stackedHeaders={stackedHeaders} />}
          {tab === 'payload' && <PayloadTab entry={active} />}
          {tab === 'preview' && <PreviewTab entry={active} />}
          {tab === 'response' && <ResponseTab entry={active} />}
          {tab === 'timing' && <TimingTab entry={active} />}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '80%',
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  closeButton: {
    position: 'absolute',
    right: 12,
    top: 6,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
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
