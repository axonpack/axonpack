import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState, useEffect, useSyncExternalStore, type ComponentType } from 'react';
import { Animated, Dimensions, Modal, PanResponder, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { DevtoolsPanel } from './devtools-panel.component';
import { CrashReportOverlay } from '../../../features/crash/components/crash-report-overlay.component';
import { markFirstRender } from '../../../features/performance/services/read-startup-timing.service';
import { HIT_SLOP } from '../../constants/metrics.const';
import type { StatusBarStyle } from '../../constants/theme.const';
import { devtoolsReadyStore } from '../../stores/devtools-ready.store';
import {
  makeThemedStyles,
  useStatusBarStyle,
  useThemeColors,
} from '../../utils/themed-styles.util';

const DEFAULT_SIZE = 44;
const EDGE_MARGIN = 16;
const TAP_THRESHOLD = 4;
const GLYPH_RATIO = 0.45;

/**
 * Props for `<DevtoolsOverlay />` — the draggable launcher button that opens the panel. All optional;
 * `<DevtoolsOverlay />` on its own is the normal usage.
 */
export type DevtoolsOverlayProps = {
  /**
   * Your own icon in place of the default bug glyph. It is handed a `size` in dp and should render
   * at it. Defaults to a Material `bug-report` icon.
   */
  iconComponent?: ComponentType<{ size: number }>;
  /** Diameter of the button in dp. Defaults to `44`, the platform's minimum tap target. */
  size?: number;
  /** Button fill. Defaults to the active theme's accent colour. */
  color?: string;
  /** Glyph colour, used by the default icon only. Defaults to `'#ffffff'`. */
  iconColor?: string;
  /**
   * What the status bar does while the panel is open. Defaults to `'auto'`.
   *
   * The panel never paints a status bar background — its header extends behind the status bar, so
   * that area is the toolbar's colour. What this decides is the *content*: the clock and the icons.
   *
   * - `'auto'` — follows the theme you are on, each of which carries its own `statusBarStyle`. A
   *   dark theme gets light icons, a light theme dark ones. Without this the app's own style stays,
   *   and a light app's dark icons are unreadable over a dark panel.
   * - `'app'` — untouched, for an app that manages the status bar itself.
   * - `'light'` / `'dark'` — the content style, whatever the theme. `'light'` means light icons, for
   *   a dark background.
   *
   * Whatever the app had is restored when the panel closes.
   *
   * On iOS this needs `UIViewControllerBasedStatusBarAppearance` set to `false` in `Info.plist`,
   * which is what an Expo app's own template does — React Native's `StatusBar` cannot change the
   * style otherwise.
   */
  statusBar?: 'app' | 'auto' | 'light' | 'dark';
};

function resolveBarStyle(
  mode: NonNullable<DevtoolsOverlayProps['statusBar']>,
  themeStyle: StatusBarStyle
): 'light-content' | 'dark-content' | null {
  if (mode === 'app') return null;
  const style = mode === 'auto' ? themeStyle : mode;
  return style === 'light' ? 'light-content' : 'dark-content';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getInitialPosition(size: number): { x: number; y: number } {
  const { width, height } = Dimensions.get('window');
  return { x: width - size - EDGE_MARGIN, y: height - size - EDGE_MARGIN * 4 };
}

/**
 * The draggable launcher button, and the panel it opens. Mount it once, anywhere inside your app's
 * tree — it renders nothing until `devtools.init()` has run, so a build that never calls `init()`
 * pays for nothing and shows nothing.
 *
 * ```tsx
 * <>
 *   <App />
 *   <DevtoolsOverlay />
 * </>
 * ```
 *
 * It also mounts the crash report sheet, so a dev build gets that without wiring a second component.
 */
export function DevtoolsOverlay({
  iconComponent: IconComponent,
  size = DEFAULT_SIZE,
  color,
  iconColor = '#ffffff',
  statusBar = 'auto',
}: DevtoolsOverlayProps = {}) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const themeStatusBarStyle = useStatusBarStyle();

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

  const glyphSize = Math.round(size * GLYPH_RATIO);
  const barStyle = resolveBarStyle(statusBar, themeStatusBarStyle);

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
        hitSlop={HIT_SLOP.default}
        {...panResponder.panHandlers}>
        {IconComponent ? (
          <IconComponent size={glyphSize} />
        ) : (
          <MaterialIcons name="bug-report" size={glyphSize} color={iconColor} />
        )}
      </Animated.View>

      {/*
        Outside the `Modal` on purpose: a `StatusBar` mounted inside one does not reach the status
        bar on iOS, where the modal is presented by a view controller of its own. Out here it is an
        entry on React Native's global stack, pushed while the panel is open and popped — restoring
        the app's own — when it closes.
      */}
      {open && barStyle !== null && <StatusBar barStyle={barStyle} />}

      {/* Mounted here so a dev build gets the crash report sheet without wiring a second
          component. It de-duplicates itself, so an app that also mounts one for production is
          fine. */}
      <CrashReportOverlay />

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaProvider style={{ flex: 1, backgroundColor: COLORS.background }}>
          {/* No `top` edge: the panel's header takes that inset itself, so the area behind the
              status bar is the toolbar's colour rather than a strip of the panel background. */}
          <SafeAreaView edges={['left', 'right']} style={styles.modal}>
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
