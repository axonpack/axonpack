import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';

import { JsonTree } from '../../../core/components/json-tree';
import { StackOrigin } from '../../../core/components/stack-origin.component';
import { BottomSheet } from '../../../core/components/ui/bottom-sheet.ui';
import { CollapsibleSection } from '../../../core/components/ui/collapsible-section.ui';
import { IconButton } from '../../../core/components/ui/icon-button.ui';
import { InsetPadding } from '../../../core/components/ui/inset-padding.ui';
import { HIT_SLOP } from '../../../core/constants/metrics.const';
import { MONOSPACE } from '../../../core/constants/typography.const';
import { formatDuration } from '../../../core/utils/format-duration.util';
import type { JsonValue } from '../../../core/utils/json-tree.util';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import { navigateTo } from '../services/attach-navigation.service';
import type { NavigationMove } from '../stores/navigation.store';
import {
  formatActionLabel,
  formatClockTime,
  formatMoveTitle,
  formatRouteName,
} from '../utils/format-navigation.util';

export function MoveDetailSheet({
  move,
  stayed,
  onClose,
}: {
  move: NavigationMove | null;
  stayed: number | null;
  onClose: () => void;
}) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const [renderedMove, setRenderedMove] = useState<NavigationMove | null>(null);
  const [prevMove, setPrevMove] = useState<NavigationMove | null>(null);

  // Keeps the last move rendered while the sheet slides out, so it doesn't blank mid-animation.
  if (move !== prevMove) {
    setPrevMove(move);
    if (move) setRenderedMove(move);
  }

  const active = move ?? renderedMove;
  if (!active) return null;

  const rows: [string, string][] = [
    ['Time', formatClockTime(active.timestamp)],
    ['Container', active.container],
    ['Action', formatActionLabel(active.action)],
    ['From', formatRouteName(active.from)],
    ['To', formatRouteName(active.to)],
    ...(active.to?.path ? ([['Path', active.to.path]] as [string, string][]) : []),
    ['On screen', active.noop ? 'no change' : stayed === null ? 'still' : formatDuration(stayed)],
  ];

  // An arrow rather than a declaration: a hoisted function loses the non-null narrowing above.
  const goAgain = () => {
    if (!active.to) return;
    const message = navigateTo(active.to.name, active.to.params, active.container);
    if (message === null) onClose();
    else Alert.alert('Could not navigate', message);
  };

  return (
    <BottomSheet
      visible={move !== null}
      onClose={onClose}
      headerContent={
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1} selectable>
            {formatMoveTitle(active)}
          </Text>
          {active.to && (
            <IconButton
              name="replay"
              color={COLORS.textSecondary}
              hitSlop={HIT_SLOP.default}
              onPress={goAgain}
              label="Go here again"
            />
          )}
          <IconButton
            name="content-copy"
            color={COLORS.textSecondary}
            hitSlop={HIT_SLOP.default}
            onPress={() => {
              Clipboard.setStringAsync(JSON.stringify(active, null, 2));
            }}
            label="Copy as JSON"
          />
        </View>
      }>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled">
        <View style={styles.info}>
          {rows.map(([label, value]) => (
            <View key={label} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={styles.infoValue} selectable>
                {value}
              </Text>
            </View>
          ))}
        </View>

        {active.to?.params && Object.keys(active.to.params).length > 0 && (
          <CollapsibleSection title="Params">
            <JsonTree value={active.to.params as unknown as JsonValue} />
          </CollapsibleSection>
        )}

        {active.payload && Object.keys(active.payload).length > 0 && (
          <CollapsibleSection title="Action payload" initiallyExpanded={false}>
            <JsonTree value={active.payload as unknown as JsonValue} />
          </CollapsibleSection>
        )}

        <CollapsibleSection title="Dispatched from" initiallyExpanded={false}>
          <StackOrigin
            id={active.id}
            frames={active.origin ?? []}
            emptyText="No call stack was captured. React Navigation attaches one in a development build."
          />
        </CollapsibleSection>

        {active.state && (
          <CollapsibleSection title="State after" initiallyExpanded={false}>
            <JsonTree value={active.state as unknown as JsonValue} defaultExpanded={false} />
          </CollapsibleSection>
        )}
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
  info: {
    paddingVertical: 4,
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
