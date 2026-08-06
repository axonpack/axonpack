import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { COLORS } from '../../constants/colors.const';
import {
  getResponseTypeVisual,
  RESOURCE_TYPE_ICONS,
} from '../../constants/network/resource-type-icons.const';
import type { NetworkLogEntry } from '../../stores/network/network-log.store';
import {
  formatSize,
  formatSource,
  getDisplayNameWithQuery,
  getMethodColor,
  getStatusColor,
} from '../../utils/network/formatters.util';
import { classifyResourceType, RESOURCE_TYPE_LABELS } from '../../utils/network/resource-type.util';
import { InfoBadge } from '../ui/info-badge.ui';

export function LogRow({
  entry,
  bigRows,
  onPress,
}: {
  entry: NetworkLogEntry;
  bigRows: boolean;
  onPress: () => void;
}) {
  const statusColor = getStatusColor(entry.status, entry.statusCode);
  const methodColor = getMethodColor(entry.method);
  const resourceType = classifyResourceType(entry.mimeType);
  const typeVisual = getResponseTypeVisual(entry.mimeType);

  return (
    <TouchableOpacity onPress={onPress} style={[styles.row, bigRows && styles.rowBig]}>
      <View style={styles.topRow}>
        <Text style={[styles.method, { color: methodColor }]} selectable>
          {entry.method}
        </Text>
        {/* Spelled out rather than "..." — the timing column shows "..." too while in flight, so
            the two were indistinguishable at a glance. */}
        <Text style={[styles.status, { color: statusColor }]} selectable>
          {entry.status === 'pending' ? 'PENDING' : (entry.statusCode ?? entry.error ?? '')}
        </Text>
        <Text style={styles.timing} numberOfLines={1} selectable>
          {entry.duration !== undefined ? `${entry.duration}ms` : '–'} ·{' '}
          {new Date(entry.startedAt).toLocaleTimeString()}
        </Text>
      </View>

      <View style={styles.urlRow}>
        <MaterialIcons
          name={typeVisual.icon}
          size={14}
          color={typeVisual.color}
          style={styles.typeIcon}
        />
        <View style={styles.urlTextGroup}>
          {bigRows && (
            <Text style={styles.name} numberOfLines={1} selectable>
              {getDisplayNameWithQuery(entry.url)}
            </Text>
          )}
          <Text
            style={[styles.url, !bigRows && styles.urlPrimary]}
            numberOfLines={bigRows ? 1 : 2}
            selectable>
            {entry.url}
          </Text>
        </View>
      </View>

      {bigRows && (
        <View style={styles.badgeRow}>
          <InfoBadge
            icon={RESOURCE_TYPE_ICONS[resourceType]}
            label={RESOURCE_TYPE_LABELS[resourceType]}
          />
          {entry.source && <InfoBadge icon="hub" label={formatSource(entry.source)} />}
          <InfoBadge icon="data-usage" label={formatSize(entry.size)} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
    backgroundColor: COLORS.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  rowBig: {
    paddingVertical: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  method: {
    fontSize: 11,
    fontWeight: '700',
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
  },
  timing: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  typeIcon: {
    marginTop: 2,
  },
  urlTextGroup: {
    flex: 1,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  url: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  urlPrimary: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
});
