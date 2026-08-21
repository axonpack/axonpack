import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { TOUCH_TARGET } from '../../constants/metrics.const';
import { animateNextLayout } from '../../utils/layout-animation.util';
import { makeThemedStyles, useThemeColors } from '../../utils/themed-styles.util';

export function CollapsibleSection({
  title,
  count,
  initiallyExpanded = true,
  headerRight,
  children,
}: {
  title: string;
  count?: number;
  initiallyExpanded?: boolean;

  headerRight?: ReactNode;
  children: ReactNode;
}) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const [expanded, setExpanded] = useState(initiallyExpanded);

  return (
    <View>
      <TouchableOpacity
        style={styles.header}
        onPress={() => {
          animateNextLayout();
          setExpanded((prev) => !prev);
        }}>
        <MaterialIcons
          name="arrow-drop-down"
          size={20}
          color={COLORS.textSecondary}
          style={!expanded && styles.iconCollapsed}
        />
        <Text style={styles.sectionTitle}>
          {title}
          {!expanded && count !== undefined ? ` (${count})` : ''}
        </Text>
        {headerRight}
      </TouchableOpacity>
      {expanded && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: COLORS.sectionTint,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    marginHorizontal: -12,
    paddingHorizontal: 12,
    minHeight: TOUCH_TARGET.row,
    paddingVertical: 6,
  },
  iconCollapsed: {
    transform: [{ rotate: '-90deg' }],
  },
  sectionTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  body: {
    paddingTop: 2,
  },
}));
