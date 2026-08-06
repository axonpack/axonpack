import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Animated, Dimensions, Modal, PanResponder, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '../../constants/colors.const';
import { NetworkView } from '../network/network-view.component';
import { AxonpackLogo } from '../ui/axonpack-logo.ui';
import { IconButton } from '../ui/icon-button.ui';

const FAB_SIZE = 40;
const EDGE_MARGIN = 16;
// Below this total finger movement, a release counts as a tap (opens the modal) rather than a drag.
const TAP_THRESHOLD = 4;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getInitialPosition(): { x: number; y: number } {
  const { width, height } = Dimensions.get('window');
  return { x: width - FAB_SIZE - EDGE_MARGIN, y: height - FAB_SIZE - EDGE_MARGIN * 4 };
}

export function DevtoolsOverlay() {
  const [open, setOpen] = useState(false);
  const [pan] = useState(() => new Animated.ValueXY(getInitialPosition()));

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
            toValue: { x: clamp(x, 0, width - FAB_SIZE), y: clamp(y, 0, height - FAB_SIZE) },
            useNativeDriver: false,
          }).start();
        });
      },
    })
  );

  return (
    <>
      <Animated.View
        style={[styles.fab, { transform: [{ translateX: pan.x }, { translateY: pan.y }] }]}
        {...panResponder.panHandlers}>
        <MaterialIcons name="bug-report" size={18} color="#ffffff" />
      </Animated.View>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaProvider style={{ flex: 1, backgroundColor: COLORS.background }}>
          <SafeAreaView edges={['left', 'right', 'top']} style={styles.modal}>
            <View style={styles.header}>
              <View style={styles.headerBrand}>
                <AxonpackLogo size={20} />
                <Text style={styles.headerTitle}>Devtools</Text>
              </View>
              <IconButton
                name="close"
                color={COLORS.textSecondary}
                onPress={() => setOpen(false)}
                hitSlop={12}
              />
            </View>
            <NetworkView />
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: COLORS.accent,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
  },
});
