import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { COLORS } from '../../constants/colors.const';
import { TOUCH_TARGET } from '../../constants/metrics.const';
import {
  blockJsThread,
  blockMainThread,
  crashJsThread,
  crashMainThread,
  isMainThreadLimiterAvailable,
} from '../../services/performance/limiter.service';
import { Chip } from '../ui/chip.ui';

type Target = 'js' | 'main';

const PRESETS = [100, 250, 500, 1000, 3000];

/**
 * Deliberately makes the app worse, so the rest of the tab can be trusted. A profiler that has never
 * been pointed at a known-bad case is a profiler nobody has calibrated.
 *
 * The two targets are not interchangeable, and the difference is the point: blocking the JS thread
 * shows up as a long task and drops the FPS reading, while blocking the main thread freezes what you
 * see and touch while the JS numbers stay perfectly healthy — which is exactly the blind spot this tab
 * warns about on the FPS card.
 */
export function LimiterPanel() {
  const [target, setTarget] = useState<Target>('js');
  const [durationMs, setDurationMs] = useState(250);
  const [customText, setCustomText] = useState('');
  const [armed, setArmed] = useState(false);

  const mainThreadAvailable = isMainThreadLimiterAvailable();
  const targetAvailable = target === 'js' || mainThreadAvailable;

  const block = () => {
    if (target === 'main') blockMainThread(durationMs);
    else blockJsThread(durationMs);
  };

  const crash = () => {
    // Two taps, never one: this ends the process, and it sits next to buttons that merely stall it.
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    if (target === 'main') crashMainThread('Crash from the devtools Limiter');
    else crashJsThread('Crash from the devtools Limiter');
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.label}>Thread</Text>
      <View style={styles.row}>
        <Chip label="JavaScript" active={target === 'js'} onPress={() => setTarget('js')} />
        <Chip label="Main (UI)" active={target === 'main'} onPress={() => setTarget('main')} />
      </View>

      <Text style={styles.label}>For</Text>
      <View style={styles.row}>
        {PRESETS.map((preset) => (
          <Chip
            key={preset}
            label={preset >= 1000 ? `${preset / 1000}s` : `${preset}ms`}
            active={durationMs === preset && customText.length === 0}
            onPress={() => {
              setCustomText('');
              setDurationMs(preset);
            }}
          />
        ))}
        <View style={styles.customRow}>
          <TextInput
            style={styles.customInput}
            value={customText}
            onChangeText={(text) => {
              const digitsOnly = text.replace(/[^0-9]/g, '');
              setCustomText(digitsOnly);
              const parsed = Number(digitsOnly);
              if (digitsOnly.length > 0 && parsed > 0) setDurationMs(parsed);
            }}
            placeholder="Custom"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="number-pad"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.unit}>ms</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, !targetAvailable && styles.buttonDisabled]}
          disabled={!targetAvailable}
          onPress={block}>
          <Text style={[styles.buttonLabel, !targetAvailable && styles.buttonLabelDisabled]}>
            Block for {durationMs}ms
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.dangerButton, !targetAvailable && styles.buttonDisabled]}
          disabled={!targetAvailable}
          onPress={crash}>
          <Text style={[styles.buttonLabel, styles.dangerLabel]}>
            {armed ? 'Tap again to crash' : 'Crash'}
          </Text>
        </TouchableOpacity>
      </View>

      {target === 'main' && !mainThreadAvailable ? (
        <Text style={styles.note}>
          Blocking the main thread needs a dev build. The JS thread works anywhere.
        </Text>
      ) : (
        <Text style={styles.note}>
          {target === 'js'
            ? 'Shows up as a long task and drops the JS frame rate.'
            : 'Freezes the screen. Watch the JS numbers stay fine while it does.'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Same shape as the network view's settings panel: it expands in place under the toolbar rather than
  // floating over the readings it is meant to move.
  panel: {
    gap: 6,
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  // Matches the canonical input row from INPUT_STYLES.md: border on the row, bare TextInput inside.
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    minHeight: TOUCH_TARGET.min,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 6,
  },
  customInput: {
    minWidth: 52,
    fontSize: 13,
    color: COLORS.textPrimary,
    padding: 0,
  },
  unit: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  button: {
    paddingHorizontal: 12,
    minHeight: TOUCH_TARGET.min,
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.sectionTint,
  },
  dangerButton: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorSurface,
  },
  buttonDisabled: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.toolbarBackground,
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
  },
  dangerLabel: {
    color: COLORS.error,
  },
  buttonLabelDisabled: {
    color: COLORS.textSecondary,
  },
  note: {
    fontSize: 11,
    lineHeight: 15,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
});
