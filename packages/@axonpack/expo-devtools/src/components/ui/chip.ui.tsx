import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import type { MaterialIconName } from './icon-button.ui';
import { HIT_SLOP, TOUCH_TARGET } from '../../constants/metrics.const';
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

  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={HIT_SLOP.default}
      style={[styles.chip, icon !== undefined && styles.chipWithIcon, activeTint]}>
      {icon !== undefined && (
        <MaterialIcons name={icon} size={13} color={active ? '#ffffff' : accent} />
      )}
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  /**
   * One geometry for both variants — with an icon and without. They used to be two render paths with
   * their own paddings, so a row mixing them (every filter panel does) put the label-only chips a
   * couple of dp taller than their neighbours and off the shared baseline.
   *
   * Height, not vertical padding: the chip *is* the tap target, so it takes the dense floor from
   * `constants/metrics.const.ts` and tops it up with `hitSlop`, rather than a padding that happened
   * to look right. The small vertical padding is only there so a larger accessibility font scale
   * grows the chip instead of touching the border.
   */
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: TOUCH_TARGET.dense,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 14,
  },
  // An icon brings its own gap, so the leading edge tightens to keep the chip from looking padded.
  chipWithIcon: {
    paddingHorizontal: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  labelActive: {
    color: '#ffffff',
  },
}));
