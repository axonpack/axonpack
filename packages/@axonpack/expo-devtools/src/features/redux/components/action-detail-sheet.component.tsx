import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';

import { StateDiff } from './state-diff.component';
import { JsonTree } from '../../../core/components/json-tree';
import { BottomSheet } from '../../../core/components/ui/bottom-sheet.ui';
import { CollapsibleSection } from '../../../core/components/ui/collapsible-section.ui';
import { IconButton } from '../../../core/components/ui/icon-button.ui';
import { InsetPadding } from '../../../core/components/ui/inset-padding.ui';
import { HIT_SLOP } from '../../../core/constants/metrics.const';
import { MONOSPACE } from '../../../core/constants/typography.const';
import type { JsonValue } from '../../../core/utils/json-tree.util';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import { reduxStore, type ReduxActionEntry } from '../stores/redux.store';
import { formatClockTime } from '../utils/format-redux.util';

export function ActionDetailSheet({
  entry,
  onClose,
}: {
  entry: ReduxActionEntry | null;
  onClose: () => void;
}) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const [renderedEntry, setRenderedEntry] = useState<ReduxActionEntry | null>(null);
  const [prevEntry, setPrevEntry] = useState<ReduxActionEntry | null>(null);

  // Keeps the last entry rendered while the sheet slides out, so it doesn't blank mid-animation.
  if (entry !== prevEntry) {
    setPrevEntry(entry);
    if (entry) setRenderedEntry(entry);
  }

  const active = entry ?? renderedEntry;
  if (!active) return null;

  const dispatchAgain = () => {
    const message = reduxStore.dispatch(active.action);
    if (message === null) onClose();
    else Alert.alert('Could not dispatch', message);
  };

  return (
    <BottomSheet
      visible={entry !== null}
      onClose={onClose}
      headerContent={
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1} selectable>
            {active.type}
          </Text>
          <IconButton
            name="replay"
            color={COLORS.textSecondary}
            hitSlop={HIT_SLOP.default}
            onPress={dispatchAgain}
            label="Dispatch again"
          />
          <IconButton
            name="visibility-off"
            color={COLORS.textSecondary}
            hitSlop={HIT_SLOP.default}
            onPress={() => {
              reduxStore.denyType(active.type);
              onClose();
            }}
            label="Stop recording this type"
          />
          <IconButton
            name="content-copy"
            color={COLORS.textSecondary}
            hitSlop={HIT_SLOP.default}
            onPress={() => {
              Clipboard.setStringAsync(JSON.stringify(active.action, null, 2));
            }}
            label="Copy action as JSON"
          />
        </View>
      }>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled">
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Time</Text>
          <Text style={styles.infoValue} selectable>
            {formatClockTime(active.timestamp)}
          </Text>
        </View>

        <CollapsibleSection title="Action">
          <JsonTree value={active.action as unknown as JsonValue} />
        </CollapsibleSection>

        <CollapsibleSection title="Diff">
          <StateDiff before={active.prevState} after={active.state} />
        </CollapsibleSection>

        <CollapsibleSection title="State after" initiallyExpanded={false}>
          <JsonTree value={(active.state ?? null) as JsonValue} defaultExpanded={false} />
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
    fontSize: 13,
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
}));
