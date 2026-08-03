import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { COLORS } from './colors';
import { animateNextLayout } from './layoutAnimation';

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
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => {
          animateNextLayout();
          setExpanded((prev) => !prev);
        }}>
        <Text style={styles.sectionTitle}>
          {title}
          {!expanded && count !== undefined ? ` (${count})` : ''}
        </Text>
        <MaterialIcons
          name={expanded ? 'expand-less' : 'expand-more'}
          size={18}
          color={COLORS.textSecondary}
        />
      </TouchableOpacity>
      {expanded && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 12,
    backgroundColor: COLORS.sectionTint,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  body: {
    paddingHorizontal: 6,
    paddingBottom: 4,
  },
});
