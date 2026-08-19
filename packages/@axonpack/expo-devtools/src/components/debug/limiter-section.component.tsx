import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { TOUCH_TARGET } from '../../constants/metrics.const';
import {
  blockJsThread,
  blockMainThread,
  crashJsThread,
  crashMainThread,
  isMainThreadLimiterAvailable,
} from '../../services/debug/limiter.service';
import { makeThemedStyles, useThemeColors } from '../../utils/themed-styles.util';
import { Chip } from '../ui/chip.ui';

type Target = 'js' | 'main';

const PRESETS = [100, 250, 500, 1000, 3000];

/**
 * Names the package rather than the tab it was pressed on. This string becomes the crash record's
 * message and outlives the UI around it — it read "Crash from the devtools Limiter" until the Limiter
 * stopped being a tab, and whoever reads it in a bug report cares that the devtools caused it, not
 * where the button happened to live that release.
 */
const CRASH_MESSAGE = 'Deliberate crash from @axonpack/expo-devtools';

export function LimiterSection() {
  const styles = useStyles();
  const COLORS = useThemeColors();
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
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    if (target === 'main') crashMainThread(`${CRASH_MESSAGE} (main thread)`);
    else crashJsThread(`${CRASH_MESSAGE} (JS thread)`);
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
            ? 'Blocking shows up as a long task and drops the JS frame rate — both on the Performance tab.'
            : 'Blocking freezes the screen while JavaScript keeps ticking. The Performance tab shows the gap: its JS numbers stay fine throughout.'}
        </Text>
      )}

      {/* The two crashes are not the same event, and the difference is the whole point of the
          Crashes tab: a JS throw is caught and reported before you let go of the button, while a
          main-thread crash ends the process and is read back off disk at the next launch. */}
      <Text style={styles.note}>
        {target === 'js'
          ? 'Crashing throws on the JS thread. The report opens straight away and stays in the Crashes tab.'
          : 'Crashing ends the process. Reopen the app and the report is waiting in the Crashes tab.'}
      </Text>
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
}));
