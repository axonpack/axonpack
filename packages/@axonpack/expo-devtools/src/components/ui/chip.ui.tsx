import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import type { MaterialIconName } from './icon-button.ui';
import { COLORS } from '../../constants/colors.const';
import { HIT_SLOP } from '../../constants/metrics.const';

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
  /** Leading glyph, e.g. the level icon on a console filter chip. */
  icon?: MaterialIconName;
  /** Fill/border color when active, and the icon's color when not. Defaults to the accent blue. */
  tint?: string;
}) {
  const accent = tint ?? COLORS.accent;
  const activeTint = active ? { backgroundColor: accent, borderColor: accent } : null;

  if (!icon) {
    return (
      // Chips are the most-tapped control in the panel and were its smallest: 22dp tall with no slop.
      // The padding below carries most of the fix; the slop covers the rest without widening the row.
      <TouchableOpacity onPress={onPress} hitSlop={HIT_SLOP.default}>
        <Text style={[styles.chip, active && styles.chipActive, activeTint]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  // An icon needs a row, so the border and padding move off the Text and onto a wrapper — hence the
  // second branch rather than one shape for both.
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={HIT_SLOP.default}
      style={[styles.iconChip, activeTint]}>
      <MaterialIcons name={icon} size={13} color={active ? '#ffffff' : accent} />
      {/* Recolored only — the fill and border belong to the wrapper here, unlike a text-only chip. */}
      <Text style={[styles.iconChipLabel, active && styles.iconChipLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
  // A shade less vertical padding than a text-only chip: the icon is taller than the label, so the two
  // shapes land on the same height rather than the same padding.
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
});
