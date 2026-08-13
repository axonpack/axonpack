import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { TOUCH_TARGET } from '../../constants/metrics.const';
import { makeThemedStyles } from '../../utils/themed-styles.util';

export type ContextMenuItem = {
  label: string;
  onPress: () => void;

  icon?: ReactNode;
};

const MENU_WIDTH = 230;
const EDGE_MARGIN = 8;

export function ContextMenu({
  anchor,
  items,
  onClose,
}: {
  anchor: { x: number; y: number } | null;
  items: ContextMenuItem[];
  onClose: () => void;
}) {
  const styles = useStyles();
  const { width, height } = useWindowDimensions();

  if (!anchor) return null;

  const left = Math.min(anchor.x, width - MENU_WIDTH - EDGE_MARGIN);
  const top = Math.min(anchor.y, height - items.length * 40 - EDGE_MARGIN);

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <View style={[styles.menu, { left, top }]}>
          {items.map((item) => (
            <Pressable
              key={item.label}
              style={styles.item}
              onPress={() => {
                item.onPress();
                onClose();
              }}>
              <View style={styles.itemRow}>
                {item.icon}
                <Text style={styles.itemText}>{item.label}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  menu: {
    position: 'absolute',
    width: MENU_WIDTH,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  item: {
    minHeight: TOUCH_TARGET.row,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemText: {
    fontSize: 13,
    color: COLORS.textPrimary,
  },
}));
