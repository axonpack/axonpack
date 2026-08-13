import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState, useEffect, type ComponentType } from 'react';
import { Animated, Dimensions, Modal, PanResponder, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { DevtoolsPanel } from './devtools-panel.component';
import { COLORS } from '../../constants/colors.const';
import { TOUCH_TARGET } from '../../constants/metrics.const';
import { markFirstRender } from '../../services/performance/read-startup-timing.service';

const DEFAULT_SIZE = 44;
const EDGE_MARGIN = 16;
// Below this total finger movement, a release counts as a tap (opens the modal) rather than a drag.
const TAP_THRESHOLD = 4;
/** The icon inside the button, as a fraction of it — a filled circle needs the margin around its glyph. */
const GLYPH_RATIO = 0.45;

export type DevtoolsOverlayProps = {
  iconComponent?: ComponentType<{ size: number }>;
  size?: number;
  color?: string;
  /** Colour of the built-in glyph only — an `iconComponent` colours itself. */
  iconColor?: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getInitialPosition(size: number): { x: number; y: number } {
  const { width, height } = Dimensions.get('window');
  return { x: width - size - EDGE_MARGIN, y: height - size - EDGE_MARGIN * 4 };
}

export function DevtoolsOverlay({
  // Capitalised so it can be used as JSX below.
  iconComponent: IconComponent,
  size = DEFAULT_SIZE,
  color = COLORS.accent,
  iconColor = '#ffffff',
}: DevtoolsOverlayProps = {}) {
  // First mount of the overlay is the closest observable stand-in for the app's first render.
  useEffect(markFirstRender, []);

  const [open, setOpen] = useState(false);
  // Read once: the button is draggable, so recomputing this later would yank it out from under the user.
  const [pan] = useState(() => new Animated.ValueXY(getInitialPosition(size)));

  const [panResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.stopAnimation((value) => {
          pan.setOffset(value);
          pan.setValue({ x: 0, y: 0 });
        });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_event, gestureState) => {
        pan.flattenOffset();
        if (Math.abs(gestureState.dx) + Math.abs(gestureState.dy) < TAP_THRESHOLD) {
          setOpen(true);
        }
        pan.stopAnimation(({ x, y }) => {
          const { width, height } = Dimensions.get('window');
          Animated.spring(pan, {
            // Clamped against the configured size, so a large button can't be parked off-screen.
            toValue: { x: clamp(x, 0, width - size), y: clamp(y, 0, height - size) },
            useNativeDriver: false,
          }).start();
        });
      },
    })
  );

  // Tops a small button up to the platform minimum rather than refusing the size the caller asked for.
  const slop = Math.max(0, (TOUCH_TARGET.min - size) / 2);
  const glyphSize = Math.round(size * GLYPH_RATIO);

  return (
    <>
      <Animated.View
        style={[
          styles.fab,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            transform: [{ translateX: pan.x }, { translateY: pan.y }],
          },
        ]}
        hitSlop={{ top: slop, bottom: slop, left: slop, right: slop }}
        {...panResponder.panHandlers}>
        {IconComponent ? (
          <IconComponent size={glyphSize} />
        ) : (
          <MaterialIcons name="bug-report" size={glyphSize} color={iconColor} />
        )}
      </Animated.View>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaProvider style={{ flex: 1, backgroundColor: COLORS.background }}>
          <SafeAreaView edges={['left', 'right', 'top']} style={styles.modal}>
            <DevtoolsPanel onClose={() => setOpen(false)} />
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Size, radius and fill are configurable, so they're applied inline; everything here is fixed.
  fab: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 999,
  },
  modal: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
