import { useSyncExternalStore } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import {
  THROTTLE_PRESET_IDS,
  THROTTLE_PRESET_LABELS,
} from '../../constants/network/throttle-presets.const';
import { networkConditionsStore } from '../../stores/network/network-conditions.store';
import { makeThemedStyles, useThemeColors } from '../../utils/themed-styles.util';
import { Chip } from '../ui/chip.ui';

function parsePositiveInt(text: string): number {
  const parsed = Number.parseInt(text.replace(/[^0-9]/g, ''), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function ThrottleSelector() {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const throttleId = useSyncExternalStore(
    networkConditionsStore.subscribe,
    networkConditionsStore.getThrottleId
  );
  const custom = useSyncExternalStore(
    networkConditionsStore.subscribe,
    networkConditionsStore.getCustomThrottle
  );

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Throttling</Text>
      <View style={styles.chipsRow}>
        {THROTTLE_PRESET_IDS.map((id) => (
          <Chip
            key={id}
            label={THROTTLE_PRESET_LABELS[id]}
            active={throttleId === id}
            onPress={() => networkConditionsStore.setThrottleId(id)}
          />
        ))}
      </View>

      {throttleId === 'custom' && (
        <View style={styles.customRow}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Download (kbps)</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={String(custom.downloadKbps)}
                onChangeText={(text) =>
                  networkConditionsStore.setCustomThrottle({
                    ...custom,
                    downloadKbps: parsePositiveInt(text),
                  })
                }
                keyboardType="number-pad"
                placeholder="750"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Latency (ms)</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={String(custom.latencyMs)}
                onChangeText={(text) =>
                  networkConditionsStore.setCustomThrottle({
                    ...custom,
                    latencyMs: parsePositiveInt(text),
                  })
                }
                keyboardType="number-pad"
                placeholder="500"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  section: {
    marginTop: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  customRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  field: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 6,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    padding: 0,
  },
}));
