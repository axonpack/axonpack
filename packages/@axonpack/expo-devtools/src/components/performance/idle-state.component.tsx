import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { COLORS } from '../../constants/colors.const';
import { TOUCH_TARGET } from '../../constants/metrics.const';
import { isUiFpsAvailable } from '../../services/performance/fps-monitor.service';
import { performanceStore } from '../../stores/performance/performance.store';

const COLLECTS = [
  'Frame rate, for both the JS and main threads',
  'Memory, both the JS heap and the whole app',
  'Long tasks — when the JS thread got stuck',
  'Slow taps',
];

/**
 * What the tab shows before anything has been recorded.
 *
 * The Performance tab starts paused by default, so this is the first thing most people see — and a screen
 * of dashes and empty lists reads as broken rather than as waiting. Measuring is not free (a frame counter
 * has to keep the thread awake, and each heap read crosses into the engine), which is the honest reason it
 * doesn't just start itself, so this says that rather than hiding it.
 */
export function IdleState() {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <MaterialIcons name="fiber-manual-record" size={22} color={COLORS.error} />
      </View>

      <Text style={styles.title}>Not recording</Text>
      <Text style={styles.lede}>
        Measuring has a small cost, so it&apos;s off until you turn it on.
      </Text>

      <View style={styles.list}>
        {COLLECTS.map((item) => (
          <View key={item} style={styles.listRow}>
            <View style={styles.bullet} />
            <Text style={styles.listText}>{item}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={() => performanceStore.setPaused(false)}>
        <MaterialIcons name="fiber-manual-record" size={18} color={COLORS.background} />
        <Text style={styles.buttonLabel}>Start recording</Text>
      </TouchableOpacity>

      <Text style={styles.footnote}>
        Startup timing is already below — that one is captured at launch.
        {isUiFpsAvailable() ? '' : ' Main-thread FPS and device memory need a dev build.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 24,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.errorSurface,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  lede: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: COLORS.textSecondary,
  },
  // Left-aligned deliberately: centred body copy is hard to scan once it runs to more than a line.
  list: {
    alignSelf: 'stretch',
    gap: 7,
    marginTop: 6,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 6,
    backgroundColor: COLORS.textSecondary,
  },
  listText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textSecondary,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 16,
    minHeight: TOUCH_TARGET.min,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.background,
  },
  footnote: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    color: COLORS.textSecondary,
  },
});
