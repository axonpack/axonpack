import { Text, View } from 'react-native';

import { Chip } from '../../../core/components/ui/chip.ui';
import { makeThemedStyles } from '../../../core/utils/themed-styles.util';
import {
  SORT_KEY_LABELS,
  SORT_KEYS,
  sortDirectionLabel,
  type NetworkSort,
} from '../utils/sort-entries.util';

/**
 * Sitting in Settings rather than in Filters because it does not decide which rows there are, only
 * what order they come in — beside grouping and row density, which are the same kind of choice.
 *
 * The direction is here as well as on the toolbar's arrow: the arrow is where it is reached from once
 * the key is known, and this is where what it currently means is written down.
 */
export function SortSelector({
  sort,
  onChange,
}: {
  sort: NetworkSort;
  onChange: (next: NetworkSort) => void;
}) {
  const styles = useStyles();

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Sort by</Text>
      <View style={styles.chipsRow}>
        {SORT_KEYS.map((key) => (
          <Chip
            key={key}
            label={SORT_KEY_LABELS[key]}
            active={sort.key === key}
            onPress={() => onChange({ ...sort, key })}
          />
        ))}
        <Chip
          icon={sort.descending ? 'arrow-downward' : 'arrow-upward'}
          label={sortDirectionLabel(sort)}
          active={false}
          onPress={() => onChange({ ...sort, descending: !sort.descending })}
        />
      </View>
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  section: {
    marginTop: 12,
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
}));
