import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { COLORS } from '../../constants/colors.const';
import { TOUCH_TARGET } from '../../constants/metrics.const';

export function SettingRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={() => onValueChange(!value)}>
      <MaterialIcons
        name={value ? 'check-box' : 'check-box-outline-blank'}
        size={20}
        color={value ? COLORS.accent : COLORS.textSecondary}
      />
      <Text style={styles.settingLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: TOUCH_TARGET.row,
    paddingVertical: 6,
  },
  settingLabel: {
    fontSize: 13,
    color: COLORS.textPrimary,
  },
});
