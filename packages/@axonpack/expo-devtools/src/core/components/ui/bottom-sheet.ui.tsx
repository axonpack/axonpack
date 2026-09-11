import { useEffect, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';

import { IconButton } from './icon-button.ui';
import { InsetPadding } from './inset-padding.ui';
import { HIT_SLOP } from '../../constants/metrics.const';
import { useAnimatedKeyboard } from '../../services/use-animated-keyboard.service';
import { makeThemedStyles, useThemeColors } from '../../utils/themed-styles.util';

// The slide is animated on the JS driver, not because a transform needs to be but because the sheet
// also sizes itself against the keyboard: one native-driven prop hands the whole view's props to the
// native animated module, which then rejects `maxHeight` — layout props it cannot animate.
const OFFSCREEN_Y = 400;
const SLIDE_IN_MS = 220;
const SLIDE_OUT_MS = 180;

export function BottomSheet({
  visible,
  onClose,
  headerContent,
  children,
}: {
  visible: boolean;
  onClose: () => void;

  headerContent?: ReactNode;
  children: ReactNode;
}) {
  // console.log('BottomSheet', { visible, headerContent });
  const styles = useStyles();
  const COLORS = useThemeColors();
  const translateY = new Animated.Value(OFFSCREEN_Y);
  const [shouldRender, setShouldRender] = useState(visible);
  const [prevVisible, setPrevVisible] = useState(visible);
  const windowDimentions = useWindowDimensions();
  const keyboard = useAnimatedKeyboard();

  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) setShouldRender(true);
  }

  useEffect(() => {
    if (visible) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: SLIDE_IN_MS,
        useNativeDriver: false,
      }).start();
      return;
    }

    // Nothing on screen means there is nothing to slide out. Running one anyway animates a value
    // attached to no view, and the next open interrupts it — see the `finished` guard below.
    if (!shouldRender) return;

    Animated.timing(translateY, {
      toValue: OFFSCREEN_Y,
      duration: SLIDE_OUT_MS,
      useNativeDriver: false,
    }).start(({ finished }) => {
      // Only a slide-out that ran to the end means the sheet is off screen. An interrupted one is
      // the next open taking the value over, and unmounting on that closes the sheet in the same
      // breath as it opened — which looked like a tap that did nothing.
      if (finished) setShouldRender(false);
    });
  }, [visible, shouldRender, translateY]);

  if (!shouldRender) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TouchableOpacity
        style={[StyleSheet.absoluteFill, styles.backdrop]}
        activeOpacity={1}
        onPress={onClose}
      />
      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY }],
            // Measured against what the keyboard leaves of the screen, not the screen: the cap is
            // there to keep the sheet inside the space it actually has.
            maxHeight: Animated.multiply(
              Animated.subtract(windowDimentions.height, keyboard.height),
              0.9
            ),
          },
        ]}>
        <View style={styles.handleRow}>
          <View style={styles.handle} />
        </View>
        <View style={styles.headerRow}>
          <View style={styles.headerContent}>{headerContent}</View>
          <IconButton
            name="close"
            color={COLORS.textSecondary}
            onPress={onClose}
            hitSlop={HIT_SLOP.default}
          />
        </View>
        {children}
        <InsetPadding edge="bottom" avoidKeyboard />
      </Animated.View>
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
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
}));
