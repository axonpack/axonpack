import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MONOSPACE } from '../../../core/constants/typography.const';
import { makeThemedStyles } from '../../../core/utils/themed-styles.util';
import { diffState, formatDiffValue, formatStatePath, MAX_CHANGES } from '../utils/diff-state.util';

export function StateDiff({ before, after }: { before: unknown; after: unknown }) {
  const styles = useStyles();
  const changes = useMemo(() => diffState(before, after), [before, after]);

  if (changes.length === 0) return <Text style={styles.empty}>The state did not change.</Text>;

  return (
    <View>
      {changes.map((change) => {
        const path = formatStatePath(change.path);
        return (
          <View key={`${change.kind}:${path}`} style={styles.change}>
            <Text style={styles.path} selectable>
              {path}
            </Text>
            {change.kind !== 'added' && (
              <Text style={[styles.value, styles.before]} selectable>
                - {formatDiffValue(change.before)}
              </Text>
            )}
            {change.kind !== 'removed' && (
              <Text style={[styles.value, styles.after]} selectable>
                + {formatDiffValue(change.after)}
              </Text>
            )}
          </View>
        );
      })}
      {changes.length >= MAX_CHANGES && (
        <Text style={styles.empty}>Only the first {MAX_CHANGES} changes are shown.</Text>
      )}
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  change: {
    paddingVertical: 6,
    gap: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  path: {
    fontFamily: MONOSPACE,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.keyAccent,
  },
  value: {
    fontFamily: MONOSPACE,
    fontSize: 11,
  },
  before: {
    color: COLORS.error,
  },
  after: {
    color: COLORS.success,
  },
  empty: {
    fontSize: 12,
    color: COLORS.textSecondary,
    paddingVertical: 8,
  },
}));
