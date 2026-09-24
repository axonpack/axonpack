import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { TOUCH_TARGET } from '../../../core/constants/metrics.const';
import { LIMITER_PRESETS_MS } from '../constants/limiter.const';
import {
  blockThread,
  crashThread,
  isMainThreadLimiterAvailable,
} from '../services/limiter.service';
import { limiterStore, useLimiterStore } from '../stores/limiter.store';
import { blockNote, crashNote, formatPreset } from '../utils/limiter-copy.util';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import { Chip } from '../../../core/components/ui/chip.ui';

export function LimiterSection() {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const { target, durationMs, customText } = useLimiterStore();
  const [armed, setArmed] = useState(false);

  const mainThreadAvailable = isMainThreadLimiterAvailable();
  const targetAvailable = target === 'js' || mainThreadAvailable;

  const crash = () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    crashThread(target);
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.label}>Thread</Text>
      <View style={styles.row}>
        <Chip
          label="JavaScript"
          active={target === 'js'}
          onPress={() => limiterStore.setTarget('js')}
        />
        <Chip
          label="Main (UI)"
          active={target === 'main'}
          onPress={() => limiterStore.setTarget('main')}
        />
      </View>

      <Text style={styles.label}>For</Text>
      <View style={styles.row}>
        {LIMITER_PRESETS_MS.map((preset) => (
          <Chip
            key={preset}
            label={formatPreset(preset)}
            active={durationMs === preset && customText.length === 0}
            onPress={() => limiterStore.choosePreset(preset)}
          />
        ))}
        <View style={styles.customRow}>
          <TextInput
            style={styles.customInput}
            value={customText}
            onChangeText={limiterStore.setCustomText}
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
          onPress={() => blockThread(target, durationMs)}>
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

      <Text style={styles.note}>{blockNote(target, mainThreadAvailable)}</Text>
      <Text style={styles.note}>{crashNote(target)}</Text>
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
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
    backgroundColor: COLORS.surface,
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
}));
