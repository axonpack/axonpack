import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { HIT_SLOP, TOUCH_TARGET } from '../../constants/metrics.const';
import { canOpenDebugger, openDebugger } from '../../services/open-debugger.service';
import { makeThemedStyles } from '../../utils/themed-styles.util';

/** Says in words that DevTools can open from here, where an icon in the header only hinted at it. */
export function MetroStrip() {
  const styles = useStyles();

  if (!canOpenDebugger) return null;

  return (
    <View style={styles.strip}>
      <Text style={styles.label}>Metro server detected</Text>
      <TouchableOpacity
        onPress={openDebugger}
        hitSlop={HIT_SLOP.dense}
        accessibilityRole="button"
        style={styles.button}>
        <Text style={styles.buttonLabel}>Open DevTools</Text>
      </TouchableOpacity>
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.sectionTint,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  label: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  button: {
    minHeight: TOUCH_TARGET.dense,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 6,
  },
  buttonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },
}));
