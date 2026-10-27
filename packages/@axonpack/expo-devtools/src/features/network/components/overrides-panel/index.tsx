import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { OverrideRow } from './override-row.component';
import { HIT_SLOP, TOUCH_TARGET } from '../../../../core/constants/metrics.const';
import { makeThemedStyles } from '../../../../core/utils/themed-styles.util';
import {
  networkOverridesStore,
  useNetworkOverridesStore,
} from '../../stores/network-overrides.store';
import type { OverrideSource } from '../../utils/override-draft.util';

/**
 * Every override and block, so a rule can be found again after its request has left the log. A list
 * header panel like Filter and Settings, with no scroll view of its own for the same reason.
 */
export function OverridesPanel({ onEdit }: { onEdit: (source: OverrideSource) => void }) {
  const styles = useStyles();
  const overrides = useNetworkOverridesStore(networkOverridesStore.getSnapshot);
  const empty = overrides.length === 0;

  function confirmClear() {
    Alert.alert('Clear all rules?', 'Every override and block will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear all', style: 'destructive', onPress: networkOverridesStore.clear },
    ]);
  }

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.count}>
          {overrides.length} {overrides.length === 1 ? 'rule' : 'rules'}
        </Text>
        <TouchableOpacity
          onPress={confirmClear}
          disabled={empty}
          hitSlop={HIT_SLOP.default}
          accessibilityLabel="Clear all overrides and blocks"
          style={styles.clear}>
          <Text style={[styles.clearLabel, empty && styles.clearOff]}>Clear all</Text>
        </TouchableOpacity>
      </View>

      {empty ? (
        <Text style={styles.empty}>No overrides or blocks. Add one from a request's ⋮ menu.</Text>
      ) : (
        overrides.map((override) => (
          <OverrideRow key={override.url} override={override} onEdit={onEdit} />
        ))
      )}
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  panel: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  count: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  clear: {
    minHeight: TOUCH_TARGET.dense,
    justifyContent: 'center',
  },
  clearLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },
  clearOff: {
    color: COLORS.textSecondary,
    opacity: 0.5,
  },
  empty: {
    fontSize: 12,
    color: COLORS.textSecondary,
    paddingTop: 8,
  },
}));
