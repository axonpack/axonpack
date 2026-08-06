import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import type { MaterialIconName } from './icon-button.ui';
import { COLORS } from '../../constants/colors.const';

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
      <TouchableOpacity onPress={onPress}>
        <Text style={[styles.chip, active && styles.chipActive, activeTint]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  // An icon needs a row, so the border and padding move off the Text and onto a wrapper — hence the
  // second branch rather than one shape for both. Text-only chips keep their original layout exactly.
  return (
    <TouchableOpacity onPress={onPress} style={[styles.iconChip, activeTint]}>
      <MaterialIcons name={icon} size={12} color={active ? '#ffffff' : accent} />
      {/* Recolored only — the fill and border belong to the wrapper here, unlike a text-only chip. */}
      <Text style={[styles.iconChipLabel, active && styles.iconChipLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
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
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  iconChipLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  iconChipLabelActive: {
    color: '#ffffff',
  },
});
