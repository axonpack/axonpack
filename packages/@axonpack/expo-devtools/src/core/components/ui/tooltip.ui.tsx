import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { makeThemedStyles } from '../../utils/themed-styles.util';

const BUBBLE_WIDTH = 160;
const EDGE_MARGIN = 8;

export function Tooltip({
  anchor,
  label,
  onClose,
}: {
  anchor: { x: number; y: number } | null;
  label: string;
  onClose: () => void;
}) {
  const styles = useStyles();
  const { width, height } = useWindowDimensions();

  if (!anchor) return null;

  const left = Math.min(
    Math.max(anchor.x - BUBBLE_WIDTH / 2, EDGE_MARGIN),
    width - BUBBLE_WIDTH - EDGE_MARGIN
  );
  const top = Math.min(Math.max(anchor.y - 44, EDGE_MARGIN), height - 44 - EDGE_MARGIN);

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <View style={[styles.bubble, { left, top }]}>
          <Text style={styles.text}>{label}</Text>
        </View>
      </Pressable>
    </Modal>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  bubble: {
    position: 'absolute',
    width: BUBBLE_WIDTH,
    backgroundColor: COLORS.textPrimary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  text: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
}));
