import { View } from 'react-native';

import { Chip } from '../../../core/components/ui/chip.ui';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import {
  invalidateQuery,
  refetchQuery,
  removeQuery,
  resetQuery,
  toggleForcedState,
} from '../services/query-actions.service';
import type { QueryRow } from '../stores/query.store';

export function QueryActions({ row }: { row: QueryRow }) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const { query } = row;
  return (
    <View style={styles.row}>
      <Chip label="Refetch" icon="refresh" active={false} onPress={() => refetchQuery(query)} />
      <Chip
        label="Invalidate"
        icon="history"
        active={false}
        onPress={() => invalidateQuery(query)}
      />
      <Chip label="Reset" icon="restart-alt" active={false} onPress={() => resetQuery(query)} />
      <Chip
        label="Remove"
        icon="delete-outline"
        tint={COLORS.error}
        active={false}
        onPress={() => removeQuery(query)}
      />
      <Chip
        label="Loading"
        icon="hourglass-empty"
        tint={COLORS.pending}
        active={row.forced === 'loading'}
        onPress={() => toggleForcedState(query, 'loading')}
      />
      <Chip
        label="Error"
        icon="error-outline"
        tint={COLORS.error}
        active={row.forced === 'error'}
        onPress={() => toggleForcedState(query, 'error')}
      />
    </View>
  );
}

const useStyles = makeThemedStyles(() => ({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
}));
