import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { JsonTree } from '../../../core/components/json-tree';
import { BottomSheet } from '../../../core/components/ui/bottom-sheet.ui';
import { CollapsibleSection } from '../../../core/components/ui/collapsible-section.ui';
import { CopyIconButton } from '../../../core/components/ui/copy-icon-button.ui';
import { InsetPadding } from '../../../core/components/ui/inset-padding.ui';
import { MONOSPACE } from '../../../core/constants/typography.const';
import { makeThemedStyles } from '../../../core/utils/themed-styles.util';
import type { AiUsageEntry } from '../stores/ai-usage.store';
import { parseReply, queryInfo } from '../utils/format-ai-usage.util';

export function QueryDetailSheet({
  entry,
  onClose,
}: {
  entry: AiUsageEntry | null;
  onClose: () => void;
}) {
  const styles = useStyles();
  const [renderedEntry, setRenderedEntry] = useState<AiUsageEntry | null>(null);
  const [prevEntry, setPrevEntry] = useState<AiUsageEntry | null>(null);

  // Keeps the last entry rendered while the sheet slides out, so it doesn't blank mid-animation.
  if (entry !== prevEntry) {
    setPrevEntry(entry);
    if (entry) setRenderedEntry(entry);
  }

  const active = entry ?? renderedEntry;
  const parsed = useMemo(
    () => (active?.reply === undefined ? undefined : parseReply(active.reply)),
    [active]
  );
  if (!active) return null;

  return (
    <BottomSheet
      visible={entry !== null}
      onClose={onClose}
      headerContent={
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={2} selectable>
            {active.command}
          </Text>
          {active.reply !== undefined && <CopyIconButton value={active.reply} />}
        </View>
      }>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {queryInfo(active).map(([label, value]) => (
          <View key={label} style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue} selectable>
              {value}
            </Text>
          </View>
        ))}

        <CollapsibleSection title="Reply">
          {active.reply === undefined ? (
            <Text style={styles.empty}>
              Not kept for a query of ai-usage, since it would repeat every earlier reply.
            </Text>
          ) : parsed !== undefined ? (
            <JsonTree value={parsed} />
          ) : (
            <Text style={styles.code} selectable>
              {active.reply || '(empty)'}
            </Text>
          )}
        </CollapsibleSection>
        <InsetPadding edge="bottom" />
      </ScrollView>
    </BottomSheet>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 12,
  },
  title: {
    flex: 1,
    fontFamily: MONOSPACE,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  content: {
    flexGrow: 0,
  },
  contentContainer: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    width: 80,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.keyAccent,
  },
  infoValue: {
    flex: 1,
    fontFamily: MONOSPACE,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  code: {
    fontFamily: MONOSPACE,
    fontSize: 11,
    color: COLORS.textPrimary,
  },
  empty: {
    fontSize: 12,
    fontStyle: 'italic',
    color: COLORS.textSecondary,
  },
}));
