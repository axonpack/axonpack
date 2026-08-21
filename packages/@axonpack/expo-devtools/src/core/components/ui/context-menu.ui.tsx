import { useState, type ReactNode } from 'react';
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

/** Both sides of `menu`'s `paddingVertical`, which the item heights alone don't account for. */
const MENU_VERTICAL_PADDING = 8;

function clamp(value: number, min: number, max: number): number {
  // `max` can fall below `min` in a short landscape window, and clamping to the smaller of the two
  // would put the menu off the top edge — the floor wins.
  return Math.max(min, Math.min(value, Math.max(min, max)));
}

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

  // Keyed on the item count so a menu of a different length falls back to the estimate rather than
  // being placed with the last menu's height.
  const [measured, setMeasured] = useState<{ count: number; height: number } | null>(null);

  if (!anchor) return null;

  const menuHeight =
    measured?.count === items.length
      ? measured.height
      : items.length * TOUCH_TARGET.row + MENU_VERTICAL_PADDING;

  const left = clamp(anchor.x, EDGE_MARGIN, width - MENU_WIDTH - EDGE_MARGIN);
  const top = clamp(anchor.y, EDGE_MARGIN, height - menuHeight - EDGE_MARGIN);

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <View
          style={[styles.menu, { left, top }]}
          // The estimate above is short whenever a label wraps, so the real height replaces it.
          onLayout={(event) =>
            setMeasured({ count: items.length, height: event.nativeEvent.layout.height })
          }>
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
