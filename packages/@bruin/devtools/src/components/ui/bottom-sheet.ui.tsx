import { useEffect, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';

import { IconButton } from './icon-button.ui';
import { COLORS } from '../../constants/colors.const';

const OFFSCREEN_Y = 400;
const SLIDE_IN_MS = 220;
const SLIDE_OUT_MS = 180;

/** A slide-up panel with a backdrop, drag handle, and close button — not a bottom-sheet
 * library, just `Animated.timing` on translateY. Keeps rendering `children` through the
 * close animation; the caller decides what "last known content" to pass in the meantime. */
export function BottomSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const [translateY] = useState(() => new Animated.Value(OFFSCREEN_Y));
  const [shouldRender, setShouldRender] = useState(visible);
  const [prevVisible, setPrevVisible] = useState(visible);

  // Adjust state during render when `visible` changes, rather than mirroring it via an effect
  // (see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) setShouldRender(true);
  }

  useEffect(() => {
    if (visible) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: SLIDE_IN_MS,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: OFFSCREEN_Y,
        duration: SLIDE_OUT_MS,
        useNativeDriver: true,
      }).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible, translateY]);

  if (!shouldRender) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TouchableOpacity
        style={[StyleSheet.absoluteFill, styles.backdrop]}
        activeOpacity={1}
        onPress={onClose}
      />
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.header}>
          <View style={styles.handle} />
          <View style={styles.closeButton}>
            <IconButton name="close" color={COLORS.textSecondary} onPress={onClose} hitSlop={12} />
          </View>
        </View>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '80%',
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  closeButton: {
    position: 'absolute',
    right: 8,
    top: 4,
  },
});
