import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { COLORS } from '../../constants/colors.const';

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text style={[styles.chip, active && styles.chipActive]}>{label}</Text>
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
});
