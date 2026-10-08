import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { JsonTree } from '../../../core/components/json-tree';
import { BottomSheet } from '../../../core/components/ui/bottom-sheet.ui';
import { CopyIconButton } from '../../../core/components/ui/copy-icon-button.ui';
import { InsetPadding } from '../../../core/components/ui/inset-padding.ui';
import { MONOSPACE } from '../../../core/constants/typography.const';
import { makeThemedStyles } from '../../../core/utils/themed-styles.util';
import { toJsonValue } from '../utils/format-query.util';

export type CacheDetail = {
  title: string;
  info: [label: string, value: string][];
  values: { label: string; value: unknown; isError?: boolean }[];
  actions?: ReactNode;
};

export function CacheDetailSheet({
  detail,
  onClose,
}: {
  detail: CacheDetail | null;
  onClose: () => void;
}) {
  const styles = useStyles();
  // Keeps the last one on screen while the sheet slides out, so it doesn't blank mid-animation.
  // Compared by title: the detail is rebuilt on every render, so its identity always changes.
  const [shown, setShown] = useState(detail);
  if (detail !== null && detail.title !== shown?.title) setShown(detail);

  const active = detail ?? shown;
  if (!active) return null;

  return (
    <BottomSheet visible={detail !== null} onClose={onClose}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title} selectable>
          {active.title}
        </Text>

        {active.actions}

        <View>
          {active.info.map(([label, value]) => (
            <View key={label} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={styles.infoValue} selectable>
                {value}
              </Text>
            </View>
          ))}
        </View>

        {active.values.map(({ label, value, isError }) => {
          const json = toJsonValue(value);
          const text = typeof json === 'string' ? json : JSON.stringify(json, null, 2);
          return (
            <View key={label} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>{label}</Text>
                <CopyIconButton value={text} />
              </View>
              {value === undefined ? (
                <Text style={styles.empty}>None</Text>
              ) : typeof json === 'object' && json !== null ? (
                <JsonTree value={json} />
              ) : (
                <Text style={[styles.monospace, isError && styles.error]} selectable>
                  {text}
                </Text>
              )}
            </View>
          );
        })}
        <InsetPadding edge="bottom" />
      </ScrollView>
    </BottomSheet>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  content: {
    flexGrow: 0,
  },
  contentContainer: {
    gap: 12,
    padding: 12,
    paddingBottom: 24,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: MONOSPACE,
    color: COLORS.textPrimary,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    width: 110,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.keyAccent,
  },
  infoValue: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  section: {
    gap: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  monospace: {
    fontFamily: MONOSPACE,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  error: {
    color: COLORS.error,
  },
  empty: {
    fontSize: 12,
    fontStyle: 'italic',
    color: COLORS.textSecondary,
  },
}));
