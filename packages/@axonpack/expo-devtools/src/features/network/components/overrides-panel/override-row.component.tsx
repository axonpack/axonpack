import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { HIT_SLOP, TOUCH_TARGET } from '../../../../core/constants/metrics.const';
import { MONOSPACE } from '../../../../core/constants/typography.const';
import { makeThemedStyles, useThemeColors } from '../../../../core/utils/themed-styles.util';
import { networkOverridesStore, type NetworkOverride } from '../../stores/network-overrides.store';
import type { OverrideSource } from '../../utils/override-draft.util';

export function OverrideRow({
  override,
  onEdit,
}: {
  override: NetworkOverride;
  onEdit: (source: OverrideSource) => void;
}) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const [expanded, setExpanded] = useState(false);
  const { url } = override;
  const blocked = override.action === 'block';

  const edit = () => onEdit({ url });
  const remove = {
    label: 'Remove',
    color: COLORS.error,
    onPress: () => networkOverridesStore.remove(url),
  };
  // A block has nothing to edit, so its Override opens the editor and saving there makes the rule an
  // override. An Edit beside it would be the same button twice.
  const actions: { label: string; color: string; onPress: () => void }[] = blocked
    ? [{ label: 'Override', color: COLORS.accent, onPress: edit }, remove]
    : [
        { label: 'Edit', color: COLORS.accent, onPress: edit },
        {
          label: 'Block',
          color: COLORS.accent,
          // The response stays on the rule, so Override later starts from it again.
          onPress: () => networkOverridesStore.set({ ...override, action: 'block' }),
        },
        remove,
      ];

  return (
    <View style={styles.row}>
      <Text style={[styles.kind, blocked && { color: COLORS.error }]}>
        {blocked ? 'Blocked' : `Override ${override.status ?? 200}`}
      </Text>
      {/* One line until tapped, then the whole URL, selectable. */}
      <Text
        style={styles.url}
        numberOfLines={expanded ? undefined : 1}
        selectable={expanded}
        onPress={() => setExpanded((current) => !current)}>
        {url}
      </Text>
      <View style={styles.actions}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.label}
            onPress={action.onPress}
            hitSlop={HIT_SLOP.default}
            style={styles.action}>
            <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  row: {
    gap: 2,
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  kind: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  url: {
    fontFamily: MONOSPACE,
    fontSize: 11,
    color: COLORS.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  action: {
    minHeight: TOUCH_TARGET.dense,
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
}));
