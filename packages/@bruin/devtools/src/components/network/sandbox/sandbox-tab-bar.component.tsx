import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { COLORS } from '../../../constants/colors.const';
import type { SandboxTab } from '../../../utils/network/sandbox.util';

export function SandboxTabBar({
  tab,
  onChange,
  responseStatus,
}: {
  tab: SandboxTab;
  onChange: (tab: SandboxTab) => void;
  responseStatus: number | undefined;
}) {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.tabButton, tab === 'request' && styles.tabButtonActive]}
        onPress={() => onChange('request')}>
        <Text style={[styles.tabLabel, tab === 'request' && styles.tabLabelActive]}>Request</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabButton, tab === 'response' && styles.tabButtonActive]}
        onPress={() => onChange('response')}>
        <Text style={[styles.tabLabel, tab === 'response' && styles.tabLabelActive]}>
          {responseStatus ? `Response (${responseStatus})` : 'Response'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: COLORS.accent,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabLabelActive: {
    color: COLORS.accent,
  },
});
