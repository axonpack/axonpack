import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Chip } from '../../../core/components/ui/chip.ui';
import { SearchInput } from '../../../core/components/ui/search-input.ui';
import { SettingRow } from '../../../core/components/ui/setting-row.ui';
import { TextField } from '../../../core/components/ui/text-field.ui';
import { HIT_SLOP, TOUCH_TARGET } from '../../../core/constants/metrics.const';
import { animateNextLayout } from '../../../core/utils/layout-animation.util';
import { makeThemedStyles } from '../../../core/utils/themed-styles.util';
import {
  isUnreadable,
  statusClassLabel,
  type CompiledNetworkFilters,
  type NetworkFilters,
  type StatusClass,
} from '../utils/filter-entries.util';
import { formatSource } from '../utils/formatters.util';
import { RESOURCE_TYPE_LABELS, RESOURCE_TYPES } from '../utils/resource-type.util';

/** In or out, which is what a set of chips means where a single value used to be one of them. */
function toggle(selected: readonly string[], value: string): string[] {
  return selected.includes(value)
    ? selected.filter((current) => current !== value)
    : [...selected, value];
}

export function FilterPanel({
  filters,
  compiled,
  onChange,
  onClear,
  visibleCount,
  totalCount,
  statuses,
  methods,
  sources,
  searchInvalid,
  filtersActive,
}: {
  filters: NetworkFilters;
  compiled: CompiledNetworkFilters;
  onChange: (patch: Partial<NetworkFilters>) => void;
  onClear: () => void;
  visibleCount: number;
  totalCount: number;
  /** The bands actually present in the log, so a filter is never offered for nothing. */
  statuses: StatusClass[];
  methods: string[];
  sources: string[];
  searchInvalid: boolean;
  filtersActive: boolean;
}) {
  const styles = useStyles();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.count}>
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
          style={styles.clear}>
          <Text style={[styles.clearLabel, !filtersActive && styles.clearOff]}>Clear</Text>
        </TouchableOpacity>
      </View>

      <SearchInput
        value={filters.search}
        onChangeText={(search) => onChange({ search })}
        modes={filters.modes}
        onModesChange={(modes) => onChange({ modes })}
        invalid={searchInvalid}
      />

      <Text style={styles.sectionLabel}>Type</Text>
      <View style={styles.chipsRow}>
        <Chip label="All" active={filters.type === null} onPress={() => onChange({ type: null })} />
        {RESOURCE_TYPES.map((type) => (
          <Chip
            key={type}
            label={RESOURCE_TYPE_LABELS[type]}
            active={filters.type === type}
            onPress={() => onChange({ type })}
          />
        ))}
      </View>

      <Text style={styles.sectionLabel}>Status</Text>
      {statuses.length > 0 && (
        // Presets for the field below rather than a filter of their own: one status filter, reachable
        // in a tap for the common case and typed for the rest.
        <View style={styles.chipsRow}>
          <Chip
            label="All"
            active={filters.statusQuery.trim().length === 0}
            onPress={() => onChange({ statusQuery: '' })}
          />
          {statuses.map((status) => (
            <Chip
              key={status}
              label={statusClassLabel(status)}
              active={filters.statusQuery.trim().toLowerCase() === status}
              onPress={() => onChange({ statusQuery: status })}
            />
          ))}
        </View>
      )}
      <View style={styles.fieldRow}>
        <TextField
          label="Status expression"
          value={filters.statusQuery}
          onChangeText={(statusQuery) => onChange({ statusQuery })}
          placeholder="404, 4xx, >= 400, 200-299"
          invalid={isUnreadable(filters.statusQuery, compiled.status)}
        />
      </View>

      {methods.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Method</Text>
          <View style={styles.chipsRow}>
            <Chip
              label="All"
              active={filters.methods.length === 0}
              onPress={() => onChange({ methods: [] })}
            />
            {methods.map((method) => (
              <Chip
                key={method}
                label={method}
                active={filters.methods.includes(method)}
                onPress={() => onChange({ methods: toggle(filters.methods, method) })}
              />
            ))}
          </View>
        </>
      )}

      {sources.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Source</Text>
          <View style={styles.chipsRow}>
            <Chip
              label="All"
              active={filters.sources.length === 0}
              onPress={() => onChange({ sources: [] })}
            />
            {sources.map((source) => (
              <Chip
                key={source}
                label={formatSource(source)}
                active={filters.sources.includes(source)}
                onPress={() => onChange({ sources: toggle(filters.sources, source) })}
              />
            ))}
          </View>
        </>
      )}

      <TouchableOpacity
        onPress={() => {
          animateNextLayout();
          setMoreOpen((current) => !current);
        }}>
        <Text style={styles.moreToggle}>{moreOpen ? 'Hide more filters' : 'More filters'}</Text>
      </TouchableOpacity>

      {moreOpen && (
        <View>
          <Text style={styles.sectionLabel}>Size</Text>
          <View style={styles.fieldRow}>
            <TextField
              label="At least"
              value={filters.minSize}
              onChangeText={(minSize) => onChange({ minSize })}
              placeholder="20kb"
              invalid={isUnreadable(filters.minSize, compiled.minSize)}
              numeric
            />
            <TextField
              label="At most"
              value={filters.maxSize}
              onChangeText={(maxSize) => onChange({ maxSize })}
              placeholder="2mb"
              invalid={isUnreadable(filters.maxSize, compiled.maxSize)}
              numeric
            />
          </View>

          <Text style={styles.sectionLabel}>Duration</Text>
          <View style={styles.fieldRow}>
            <TextField
              label="At least"
              value={filters.minDuration}
              onChangeText={(minDuration) => onChange({ minDuration })}
              placeholder="500ms"
              invalid={isUnreadable(filters.minDuration, compiled.minDuration)}
              numeric
            />
            <TextField
              label="At most"
              value={filters.maxDuration}
              onChangeText={(maxDuration) => onChange({ maxDuration })}
              placeholder="2s"
              invalid={isUnreadable(filters.maxDuration, compiled.maxDuration)}
              numeric
            />
          </View>

          <SettingRow
            label="Only requests in flight"
            value={filters.inFlightOnly}
            onValueChange={(inFlightOnly) => onChange({ inFlightOnly })}
          />
          <SettingRow
            label="Only overridden or blocked"
            value={filters.interceptedOnly}
            onValueChange={(interceptedOnly) => onChange({ interceptedOnly })}
          />
          <SettingRow
            label="Hide data URLs"
            value={filters.hideDataUrls}
            onValueChange={(hideDataUrls) => onChange({ hideDataUrls })}
          />
          <SettingRow
            label="Hide failed requests"
            value={filters.hideFailed}
            onValueChange={(hideFailed) => onChange({ hideFailed })}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
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
  moreToggle: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '600',
    marginTop: 10,
  },
  sectionLabel: {
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
  // Two fields side by side, which is how a min and a max are read.
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
}));
