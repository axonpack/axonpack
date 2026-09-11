import type { MenuItem } from '@axonpack/react-pretty-print';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

export type MenuState = { items: MenuItem[]; x: number; y: number };

const MENU_WIDTH = 230;
const ITEM_HEIGHT = 44;
const EDGE_MARGIN = 8;

/**
 * The native half of what the package deliberately doesn't ship. `Modal`, `useWindowDimensions`
 * and `StyleSheet.absoluteFill` are all RN-only, which is exactly why the popover is the
 * consumer's job and only the items come from the package — the web example renders the same
 * `items` array as a fixed-position div.
 */
export function ContextMenu({ menu, onClose }: { menu: MenuState | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  if (!menu) return null;

  const left = Math.max(EDGE_MARGIN, Math.min(menu.x, width - MENU_WIDTH - EDGE_MARGIN));
  const top = Math.max(
    EDGE_MARGIN,
    Math.min(menu.y, height - menu.items.length * ITEM_HEIGHT - EDGE_MARGIN)
  );

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <View style={[styles.menu, { left, top }]}>
          {menu.items.map((item) => (
            <Pressable
              key={item.label}
              style={styles.item}
              onPress={() => {
                item.onSelect();
                onClose();
              }}>
              <Text style={styles.itemText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: 'absolute',
    width: MENU_WIDTH,
    paddingVertical: 4,
    backgroundColor: '#1c2128',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#30363d',
    elevation: 8,
  },
  item: {
    minHeight: ITEM_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  itemText: {
    fontSize: 13,
    color: '#e6edf3',
  },
});
