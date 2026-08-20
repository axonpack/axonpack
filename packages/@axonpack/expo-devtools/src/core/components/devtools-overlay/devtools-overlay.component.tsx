import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState, useEffect, useSyncExternalStore, type ComponentType } from 'react';
import { Animated, Dimensions, Modal, PanResponder } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { DevtoolsPanel } from './devtools-panel.component';
import { CrashReportOverlay } from '../../../features/crash/components/crash-report-overlay.component';
import { TOUCH_TARGET } from '../../constants/metrics.const';
import { markFirstRender } from '../../../features/performance/services/read-startup-timing.service';
import { devtoolsReadyStore } from '../../stores/devtools-ready.store';
import { makeThemedStyles, useThemeColors } from '../../utils/themed-styles.util';

const DEFAULT_SIZE = 44;
const EDGE_MARGIN = 16;
const TAP_THRESHOLD = 4;
const GLYPH_RATIO = 0.45;

export type DevtoolsOverlayProps = {
  iconComponent?: ComponentType<{ size: number }>;
  size?: number;
  color?: string;
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
  iconComponent: IconComponent,
  size = DEFAULT_SIZE,
  color,
  iconColor = '#ffffff',
}: DevtoolsOverlayProps = {}) {
  const styles = useStyles();
  const COLORS = useThemeColors();

  /**
   * Subscribed rather than read once: `init()` usually runs at module scope, before anything
   * renders, but an app that calls it from an effect mounts this first and needs the button to
   * appear when it lands.
   */
  const ready = useSyncExternalStore(devtoolsReadyStore.subscribe, devtoolsReadyStore.isReady);

  const fill = color ?? COLORS.accent;
  useEffect(markFirstRender, []);

  const [open, setOpen] = useState(false);
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
            toValue: { x: clamp(x, 0, width - size), y: clamp(y, 0, height - size) },
            useNativeDriver: false,
          }).start();
        });
      },
    })
  );

  const slop = Math.max(0, (TOUCH_TARGET.min - size) / 2);
  const glyphSize = Math.round(size * GLYPH_RATIO);

  /**
   * No `init()`, no button. The panel is the only way to reach the Debug tab and the console REPL,
   * so hiding it is what makes an unguarded mount in a release build harmless rather than a
   * reachable devtools panel over empty lists.
   *
   * The crash overlay is deliberately outside that: it is the one subsystem meant to run in
   * production, and an app that mounts this component unguarded should still get its crash reports.
   */
  if (!ready) return <CrashReportOverlay />;

  return (
    <>
      <Animated.View
        style={[
          styles.fab,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: fill,
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

      {/* Mounted here so a dev build gets the crash report sheet without wiring a second
          component. It de-duplicates itself, so an app that also mounts one for production is
          fine. */}
      <CrashReportOverlay />

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

const useStyles = makeThemedStyles((COLORS) => ({
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
}));
