import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { COLORS } from '../../../constants/colors.const';
import { animateNextLayout } from '../../../utils/layout-animation.util';

export function CollapsibleSection({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(true);

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
          size={18}
          color={COLORS.textSecondary}
          style={!expanded && styles.iconCollapsed}
        />
        <Text style={styles.sectionTitle}>
          {title}
          {!expanded && count !== undefined ? ` (${count})` : ''}
        </Text>
      </TouchableOpacity>
      {expanded && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: COLORS.sectionTint,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    // Bleeds past the screen's own horizontal content padding so the tint spans edge-to-edge,
    // then reapplies it via paddingHorizontal to keep the title's inset unchanged.
    marginHorizontal: -12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  iconCollapsed: {
    transform: [{ rotate: '-90deg' }],
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  body: {
    paddingTop: 2,
  },
});
