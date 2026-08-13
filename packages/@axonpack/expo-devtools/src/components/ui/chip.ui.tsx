import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import type { MaterialIconName } from './icon-button.ui';
import { HIT_SLOP } from '../../constants/metrics.const';
import { makeThemedStyles, useThemeColors } from '../../utils/themed-styles.util';

export function Chip({
  label,
  active,
  onPress,
  icon,
  tint,
}: {
  label: string;
  active: boolean;
  onPress: () => void;

  icon?: MaterialIconName;

  tint?: string;
}) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const accent = tint ?? COLORS.accent;
  const activeTint = active ? { backgroundColor: accent, borderColor: accent } : null;

  if (!icon) {
    return (
      <TouchableOpacity onPress={onPress} hitSlop={HIT_SLOP.default}>
        <Text style={[styles.chip, active && styles.chipActive, activeTint]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={HIT_SLOP.default}
      style={[styles.iconChip, activeTint]}>
      <MaterialIcons name={icon} size={13} color={active ? '#ffffff' : accent} />
      {}
      <Text style={[styles.iconChipLabel, active && styles.iconChipLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  chip: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  chipActive: {
    color: '#ffffff',
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },

  iconChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  iconChipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  iconChipLabelActive: {
    color: '#ffffff',
  },
}));
