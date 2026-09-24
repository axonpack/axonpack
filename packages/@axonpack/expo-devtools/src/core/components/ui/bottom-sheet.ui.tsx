import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Platform,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import { IconButton } from './icon-button.ui';
import { InsetPadding } from './inset-padding.ui';
import { HIT_SLOP } from '../../constants/metrics.const';
import { makeThemedStyles, useThemeColors } from '../../utils/themed-styles.util';

/**
 * The motion `@gorhom/bottom-sheet` settled on: a spring on iOS, critically damped so it never
 * overshoots, and a short ease-out on Android, where a spring reads as a bounce.
 */
function animateTo(value: Animated.Value, toValue: number, velocity = 0) {
  return Platform.OS === 'ios'
    ? Animated.spring(value, {
        toValue,
        velocity,
        damping: 500,
        stiffness: 1000,
        mass: 3,
        overshootClamping: true,
        restDisplacementThreshold: 10,
        restSpeedThreshold: 10,
        useNativeDriver: true,
      })
    : Animated.timing(value, {
        toValue,
        duration: 250,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      });
}

/** How far down a drag starts to count as one, rather than as a tap on the header. */
const DRAG_SLOP = 4;
const BACKDROP_OPACITY = 0.3;
/** What stays uncovered above the tallest sheet, so it still reads as a sheet over the panel. */
const TOP_GAP = 12;

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
  const styles = useStyles();
  const COLORS = useThemeColors();
  const window = useWindowDimensions();

  // Made once. A value made in the render body is a new value on every render, and the effect that
  // depends on it ran the slide again each time: typing, or a request updating underneath, reopened
  // the sheet from off screen.
  const [progress] = useState(() => new Animated.Value(0));
  const [drag] = useState(() => new Animated.Value(0));
  const [height, setHeight] = useState(0);
  // The space the sheet sits in, which is the panel below its header, not the window.
  const [container, setContainer] = useState(0);
  const [shouldRender, setShouldRender] = useState(visible);
  const [prevVisible, setPrevVisible] = useState(visible);

  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) setShouldRender(true);
  }

  // Slid by its own height once it has one, so a tall sheet leaves the screen whole instead of
  // jumping the last of the way. The window's height covers the first frame, before it is measured.
  const distance = height || window.height;
  const translateY = useMemo(
    () =>
      Animated.add(progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }), drag),
    [progress, drag, distance]
  );
  const backdropOpacity = useMemo(
    () => progress.interpolate({ inputRange: [0, 1], outputRange: [0, BACKDROP_OPACITY] }),
    [progress]
  );

  // The slide waits for the first measurement. Started on the window's height and then handed the
  // real one, the distance changed under a running spring and the sheet jumped. Later changes to
  // the height do not restart it: at rest, the distance multiplies nothing.
  const measured = height > 0;

  useEffect(() => {
    if (visible) {
      if (!measured) return;
      drag.setValue(0);
      animateTo(progress, 1).start();
      return;
    }
    if (!shouldRender) return;
    animateTo(progress, 0).start(({ finished }) => {
      // Only a slide-out that ran to the end means the sheet is off screen. An interrupted one is
      // the next open taking the value over, and unmounting then closes it as it opens.
      if (finished) setShouldRender(false);
    });
  }, [visible, shouldRender, measured, progress, drag]);

  // Pulled down by the handle or the header, as a sheet is. Released past half its height, after
  // the throw is projected forward the way the gorhom sheet projects it, it closes; short of that
  // it springs back.
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          gesture.dy > DRAG_SLOP && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_event, gesture) => drag.setValue(Math.max(0, gesture.dy)),
        onPanResponderRelease: (_event, gesture) => {
          const projected = gesture.dy + 0.2 * gesture.vy * 1000;
          if (projected > distance / 2) {
            onClose();
            return;
          }
          animateTo(drag, 0, gesture.vy).start();
        },
        onPanResponderTerminate: () => animateTo(drag, 0).start(),
      }),
    [drag, distance, onClose]
  );

  // Everything the panel has but a strip at the top, keyboard or not. A sheet with more to show
  // takes the height it needs, up to there, instead of stopping at a share of the panel and
  // scrolling. The keyboard does not move the sheet: it grows it by the room it takes, and the
  // content shrinks and scrolls only once the sheet has nowhere left to grow.
  const maxHeight = (container || window.height) - TOP_GAP;

  if (!shouldRender) return null;

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
      onLayout={(event) => setContainer(event.nativeEvent.layout.height)}>
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
      </Animated.View>
      {/* The cap on the outer view and the native-driven slide on the view inside: a view whose
          props are native-driven cannot also hold a JS-driven one, and the keyboard space at the
          foot of the sheet is JS-driven layout. */}
      <View style={[styles.frame, { maxHeight }]} pointerEvents="box-none">
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
          onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
          accessibilityViewIsModal>
          <View {...pan.panHandlers}>
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
          </View>
          <View style={styles.content}>{children}</View>
          {/* The sheet's bottom stays on the screen's bottom. This takes the keyboard's height
              while it is up, and the home indicator's while it is not, so the sheet grows by the
              room the keyboard takes and the content above it stays in view. Nothing inside a
              sheet adjusts for the keyboard as well: a scroll view with iOS's automatic keyboard
              insets added the keyboard a second time and was left scrolling past its end. */}
          <InsetPadding edge="bottom" avoidKeyboard />
        </Animated.View>
      </View>
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  backdrop: {
    backgroundColor: '#000',
  },
  frame: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  sheet: {
    // Shrinks to the frame's cap. Without it the content keeps its own height, overflows the cap,
    // and the keyboard space at the foot is pushed off the bottom of the screen.
    flexShrink: 1,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 12,
  },
  content: {
    flexShrink: 1,
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
