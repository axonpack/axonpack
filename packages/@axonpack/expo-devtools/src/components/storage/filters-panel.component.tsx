import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { HIT_SLOP, TOUCH_TARGET } from '../../constants/metrics.const';
import {
  STORED_VALUE_ICONS,
  STORED_VALUE_LABELS,
  STORED_VALUE_KINDS,
} from '../../constants/storage/value-type-icons.const';
import type { StoredValueKind } from '../../utils/storage/classify-value.util';
import { storedValueColor } from '../../utils/storage/classify-value.util';
import type { StorageFilters, StorageSortField } from '../../utils/storage/filter-entries.util';
import { hasActiveFilters } from '../../utils/storage/filter-entries.util';
import type { Matcher } from '../../utils/text-search.util';
import { makeThemedStyles, useThemeColors } from '../../utils/themed-styles.util';
import { Chip } from '../ui/chip.ui';
import { SearchInput } from '../ui/search-input.ui';
import { SettingRow } from '../ui/setting-row.ui';

const SCOPES: { key: StorageFilters['scope']; label: string }[] = [
  { key: 'both', label: 'Keys + values' },
  { key: 'keys', label: 'Keys' },
  { key: 'values', label: 'Values' },
];

const SORTS: { key: StorageSortField; label: string }[] = [
  { key: 'key', label: 'Key' },
  { key: 'size', label: 'Size' },
  { key: 'type', label: 'Type' },
];

export function FiltersPanel({
  filters,
  onChange,
  onClear,
  matcher,
  visibleCount,
  totalCount,
  countsByKind,
  sort,
  onChangeSort,
  descending,
  onToggleDescending,
  groupByNamespace,
  onChangeGroupByNamespace,
  moreOpen,
  onToggleMore,
}: {
  filters: StorageFilters;
  onChange: (patch: Partial<StorageFilters>) => void;
  onClear: () => void;
  matcher: Matcher | null;
  visibleCount: number;
  totalCount: number;
  countsByKind: Partial<Record<StoredValueKind, number>>;
  sort: StorageSortField;
  onChangeSort: (sort: StorageSortField) => void;
  descending: boolean;
  onToggleDescending: () => void;
  groupByNamespace: boolean;
  onChangeGroupByNamespace: (value: boolean) => void;
  moreOpen: boolean;
  onToggleMore: () => void;
}) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const filtersActive = hasActiveFilters(filters);
  const presentKinds = STORED_VALUE_KINDS.filter((kind) => (countsByKind[kind] ?? 0) > 0);

  return (
    <View style={styles.panel}>
      <View style={styles.filterHeader}>
        <Text style={styles.filterCount}>
          {visibleCount} of {totalCount}
        </Text>
        <Chip
          label="Invert"
          active={filters.invert}
          onPress={() => onChange({ invert: !filters.invert })}
        />
        <TouchableOpacity
          onPress={onClear}
          disabled={!filtersActive}
          hitSlop={HIT_SLOP.default}
          accessibilityLabel="Clear all filters"
          style={styles.clearFilters}>
          <Text style={[styles.clearFiltersLabel, !filtersActive && styles.clearFiltersOff]}>
            Clear
          </Text>
        </TouchableOpacity>
      </View>

      <SearchInput
        value={filters.search}
        onChangeText={(search) => onChange({ search })}
        modes={filters.modes}
        onModesChange={(modes) => onChange({ modes })}
        placeholder="Filter keys and values"
        invalid={matcher?.invalid ?? false}
      />

      <Text style={styles.filterSectionLabel}>Search in</Text>
      <View style={styles.chipsRow}>
        {SCOPES.map(({ key, label }) => (
          <Chip
            key={key}
            label={label}
            active={filters.scope === key}
            onPress={() => onChange({ scope: key })}
          />
        ))}
      </View>

      {presentKinds.length > 1 && (
        <>
          <Text style={styles.filterSectionLabel}>Type</Text>
          <View style={styles.chipsRow}>
            <Chip
              label={`All (${totalCount})`}
              active={filters.kind === null}
              onPress={() => onChange({ kind: null })}
            />
            {presentKinds.map((kind) => (
              <Chip
                key={kind}
                label={`${STORED_VALUE_LABELS[kind]} (${countsByKind[kind] ?? 0})`}
                icon={STORED_VALUE_ICONS[kind]}
                tint={storedValueColor(COLORS, kind)}
                active={filters.kind === kind}
                onPress={() => onChange({ kind })}
              />
            ))}
          </View>
        </>
      )}

      <Text style={styles.filterSectionLabel}>Sort by</Text>
      <View style={styles.chipsRow}>
        {SORTS.map(({ key, label }) => (
          <Chip key={key} label={label} active={sort === key} onPress={() => onChangeSort(key)} />
        ))}
        <Chip
          label={descending ? 'Descending' : 'Ascending'}
          icon={descending ? 'arrow-downward' : 'arrow-upward'}
          active={descending}
          onPress={onToggleDescending}
        />
      </View>

      <TouchableOpacity onPress={onToggleMore}>
        <Text style={styles.moreFiltersToggle}>
          {moreOpen ? 'Hide more filters' : 'More filters'}
        </Text>
      </TouchableOpacity>

      {moreOpen && (
        <View>
          <SettingRow
            label="Group by namespace"
            value={groupByNamespace}
            onValueChange={onChangeGroupByNamespace}
          />
          <SettingRow
            label="Hide empty values"
            value={filters.hideEmpty}
            onValueChange={(hideEmpty) => onChange({ hideEmpty })}
          />
          <SettingRow
            label="JSON values only"
            value={filters.jsonOnly}
            onValueChange={(jsonOnly) => onChange({ jsonOnly })}
          />
        </View>
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
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  filterCount: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  clearFilters: {
    minHeight: TOUCH_TARGET.dense,
    justifyContent: 'center',
  },
  clearFiltersLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },
  clearFiltersOff: {
    color: COLORS.textSecondary,
    opacity: 0.5,
  },
  filterSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  moreFiltersToggle: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '600',
    marginTop: 10,
  },
}));
