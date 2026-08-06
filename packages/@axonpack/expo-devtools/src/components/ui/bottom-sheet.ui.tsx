import { useEffect, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';

import { AxonpackLogo } from './axonpack-logo.ui';
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
  headerContent,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  /** Fills the header row between the logo on the left and the close button on the right. */
  headerContent?: ReactNode;
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
        <View style={styles.handleRow}>
          <View style={styles.handle} />
        </View>
        <View style={styles.headerRow}>
          <AxonpackLogo size={18} />
          <View style={styles.headerContent}>{headerContent}</View>
          <IconButton name="close" color={COLORS.textSecondary} onPress={onClose} hitSlop={12} />
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
    maxHeight: '90%',
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 12,
  },
  handleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  // No vertical padding — headerContent sets the row's height itself, so a tab bar's active
  // underline sits flush against the separator below instead of floating above it. minHeight
  // keeps the logo and close button off the separator when there's no header content at all.
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 40,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
