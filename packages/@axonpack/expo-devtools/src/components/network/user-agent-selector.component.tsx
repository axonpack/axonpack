import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSyncExternalStore } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { COLORS } from '../../constants/colors.const';
import {
  USER_AGENT_PRESET_IDS,
  USER_AGENT_PRESET_LABELS,
  USER_AGENT_PRESET_VALUES,
} from '../../constants/network/user-agent-presets.const';
import { networkConditionsStore } from '../../stores/network/network-conditions.store';
import { Chip } from '../ui/chip.ui';

export function UserAgentSelector() {
  const userAgentId = useSyncExternalStore(
    networkConditionsStore.subscribe,
    networkConditionsStore.getUserAgentId
  );
  const customUserAgent = useSyncExternalStore(
    networkConditionsStore.subscribe,
    networkConditionsStore.getCustomUserAgent
  );

  const presetValue = USER_AGENT_PRESET_VALUES[userAgentId];

  return (
    <View style={styles.section}>
      <Text style={styles.label}>User agent</Text>
      <View style={styles.chipsRow}>
        {USER_AGENT_PRESET_IDS.map((id) => (
          <Chip
            key={id}
            label={USER_AGENT_PRESET_LABELS[id]}
            active={userAgentId === id}
            onPress={() => networkConditionsStore.setUserAgentId(id)}
          />
        ))}
      </View>

      {userAgentId === 'custom' && (
        <View style={styles.inputRow}>
          <MaterialIcons name="edit" size={16} color={COLORS.textSecondary} />
          <TextInput
            style={styles.input}
            value={customUserAgent}
            onChangeText={networkConditionsStore.setCustomUserAgent}
            placeholder="Custom user agent string"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
          />
          {customUserAgent.length > 0 && (
            <TouchableOpacity
              onPress={() => networkConditionsStore.setCustomUserAgent('')}
              hitSlop={8}>
              <MaterialIcons name="close" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {presetValue !== undefined && (
        <Text style={styles.preview} numberOfLines={2} selectable>
          {presetValue}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
    gap: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
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
  preview: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
});
