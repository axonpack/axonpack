import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, TouchableOpacity, View } from 'react-native';

import { TOUCH_TARGET } from '../../../core/constants/metrics.const';
import { isUiFpsAvailable } from '../services/fps-monitor.service';
import { performanceStore } from '../stores/performance.store';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';

const COLLECTS = [
  'Frame rate, for both the JS and main threads',
  'Memory, both the JS heap and the whole app',
  'Long tasks — when the JS thread got stuck',
  'Slow taps',
];

export function IdleState({ startupBelow = true }: { startupBelow?: boolean }) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const footnote = [
    startupBelow ? 'Startup timing is already below — that one is captured at launch.' : undefined,
    isUiFpsAvailable() ? undefined : 'Main-thread FPS and device memory need a dev build.',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <MaterialIcons name="fiber-manual-record" size={22} color={COLORS.error} />
      </View>

      <Text style={styles.title}>Not recording</Text>
      <Text style={styles.lede}>Measuring has a small cost, so it's off until you turn it on.</Text>

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

      {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
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
}));
