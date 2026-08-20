import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { TOUCH_TARGET } from '../../../../core/constants/metrics.const';
import type { SandboxTab } from '../../utils/sandbox.util';
import { makeThemedStyles } from '../../../../core/utils/themed-styles.util';

export function SandboxTabBar({
  tab,
  onChange,
  responseStatus,
}: {
  tab: SandboxTab;
  onChange: (tab: SandboxTab) => void;
  responseStatus: number | undefined;
}) {
  const styles = useStyles();
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

const useStyles = makeThemedStyles((COLORS) => ({
  row: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  tabButton: {
    flex: 1,
    minHeight: TOUCH_TARGET.min,
    alignItems: 'center',
    justifyContent: 'center',
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
}));
