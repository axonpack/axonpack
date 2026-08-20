import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, TouchableOpacity } from 'react-native';

import { TOUCH_TARGET } from '../../constants/metrics.const';
import { makeThemedStyles, useThemeColors } from '../../utils/themed-styles.util';

export function SettingRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  const styles = useStyles();
  const COLORS = useThemeColors();
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

const useStyles = makeThemedStyles((COLORS) => ({
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
}));
