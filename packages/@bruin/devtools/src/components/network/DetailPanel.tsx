import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { CollapsibleSection } from './CollapsibleSection';
import { COLORS } from './colors';
import { getStatusColor } from './formatters';
import type { NetworkLogEntry } from '../../utils/network/networkLogStore';

type Tab = 'headers' | 'preview' | 'response' | 'timing';

const TABS: { key: Tab; label: string }[] = [
  { key: 'headers', label: 'Headers' },
  { key: 'preview', label: 'Preview' },
  { key: 'response', label: 'Response' },
  { key: 'timing', label: 'Timing' },
];

function HeaderList({
  title,
  headers,
}: {
  title: string;
  headers: Record<string, string> | undefined;
}) {
  const entries = headers ? Object.entries(headers) : [];
  return (
    <CollapsibleSection title={title} count={entries.length}>
      {entries.length === 0 ? (
        <Text style={styles.emptyText}>No headers captured</Text>
      ) : (
        entries.map(([key, value]) => (
          <View key={key} style={styles.headerRow}>
            <Text style={styles.headerKey} selectable>
              {key}
            </Text>
            <Text style={styles.headerValue} selectable>
              {value}
            </Text>
          </View>
        ))
      )}
    </CollapsibleSection>
  );
}

function HeadersTab({ entry }: { entry: NetworkLogEntry }) {
  return (
    <View>
      <CollapsibleSection title="General">
        <View style={styles.headerRow}>
          <Text style={styles.headerKey} selectable>
            Request URL
          </Text>
          <Text style={styles.headerValue} selectable>
            {entry.url}
          </Text>
        </View>
        <View style={styles.headerRow}>
          <Text style={styles.headerKey} selectable>
            Request Method
          </Text>
          <Text style={styles.headerValue} selectable>
            {entry.method}
          </Text>
        </View>
        <View style={styles.headerRow}>
          <Text style={styles.headerKey} selectable>
            Status Code
          </Text>
          <View style={styles.statusValue}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(entry.status) }]} />
            <Text style={styles.headerValue} selectable>
              {entry.statusCode ?? entry.error ?? '(pending)'}
            </Text>
          </View>
        </View>
        {entry.source && (
          <View style={styles.headerRow}>
            <Text style={styles.headerKey} selectable>
              Source
            </Text>
            <Text style={styles.headerValue} selectable>
              {entry.source}
            </Text>
          </View>
        )}
      </CollapsibleSection>
      <HeaderList title="Request Headers" headers={entry.requestHeaders} />
      <HeaderList title="Response Headers" headers={entry.responseHeaders} />
    </View>
  );
}

function prettyPrint(body: string | undefined, mimeType: string | undefined): string | null {
  if (!body) return null;
  if (mimeType?.includes('json')) {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }
  // Attempt JSON pretty-printing even without an explicit content-type, since it's common
  // for APIs to omit or mislabel it.
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

function PreviewTab({ entry }: { entry: NetworkLogEntry }) {
  const preview = prettyPrint(entry.responseBody, entry.mimeType);
  return (
    <View style={styles.section}>
      {preview ? (
        <Text style={styles.monospace} selectable>
          {preview}
        </Text>
      ) : (
        <Text style={styles.emptyText}>No preview available</Text>
      )}
    </View>
  );
}

function ResponseTab({ entry }: { entry: NetworkLogEntry }) {
  return (
    <View style={styles.section}>
      {entry.responseBody ? (
        <Text style={styles.monospace} selectable>
          {entry.responseBody}
        </Text>
      ) : (
        <Text style={styles.emptyText}>No response body</Text>
      )}
    </View>
  );
}

function TimingTab({ entry }: { entry: NetworkLogEntry }) {
  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.headerKey} selectable>
          Started At
        </Text>
        <Text style={styles.headerValue} selectable>
          {new Date(entry.startedAt).toLocaleTimeString()}
        </Text>
      </View>
      <View style={styles.headerRow}>
        <Text style={styles.headerKey} selectable>
          Duration
        </Text>
        <Text style={styles.headerValue} selectable>
          {entry.duration !== undefined ? `${entry.duration} ms` : '(pending)'}
        </Text>
      </View>
      <Text style={styles.timingNote} selectable>
        A DNS/TCP/TLS/TTFB phase breakdown isn't available here — those phases happen in the native
        networking stack, below what a fetch/XHR patch can observe from JS. Start and total duration
        are the honest ceiling for on-device requests.
      </Text>
    </View>
  );
}

export function DetailPanel({
  entry,
  onClose,
}: {
  entry: NetworkLogEntry | null;
  onClose: () => void;
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
          {TABS.map((t) => (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={styles.tabButton}>
              <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {tab === 'headers' && <HeadersTab entry={active} />}
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
  section: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerKey: {
    width: 140,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  headerValue: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  statusValue: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  monospace: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  timingNote: {
    marginTop: 12,
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
});
