import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, View } from 'react-native';

import type { MaterialIconName } from './icon-button.ui';
import { makeThemedStyles, useThemeColors } from '../../utils/themed-styles.util';

export function InfoBadge({ icon, label }: { icon?: MaterialIconName; label: string }) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  return (
    <View style={styles.badge}>
      {icon && <MaterialIcons name={icon} size={11} color={COLORS.textSecondary} />}
      <Text style={styles.label} numberOfLines={1} selectable>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.toolbarBackground,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
}));
