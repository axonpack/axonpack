import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { InfoBadge } from './InfoBadge';
import { COLORS } from './colors';
import { formatSize, getDisplayNameWithQuery, getMethodColor } from './formatters';
import { RESOURCE_TYPE_ICONS } from './resourceTypeIcons';
import type { NetworkLogEntry } from '../../utils/network/networkLogStore';
import { classifyResourceType, RESOURCE_TYPE_LABELS } from '../../utils/network/resourceType';

export function LogRow({
  entry,
  bigRows,
  onPress,
}: {
  entry: NetworkLogEntry;
  bigRows: boolean;
  onPress: () => void;
}) {
  const statusColor =
    entry.status === 'success'
      ? COLORS.success
      : entry.status === 'error'
        ? COLORS.error
        : COLORS.pending;
  const methodColor = getMethodColor(entry.method);
  const resourceType = classifyResourceType(entry.mimeType);

  return (
    <TouchableOpacity onPress={onPress} style={[styles.card, bigRows && styles.cardBig]}>
      <View style={styles.topRow}>
        <View style={[styles.methodPill, { backgroundColor: methodColor }]}>
          <Text style={styles.methodPillText} selectable>
            {entry.method}
          </Text>
        </View>
        <View style={[styles.statusPill, { borderColor: statusColor }]}>
          <Text style={[styles.statusPillText, { color: statusColor }]} selectable>
            {entry.status === 'pending' ? '...' : (entry.statusCode ?? entry.error ?? '')}
          </Text>
        </View>
        <Text style={styles.timing} numberOfLines={1} selectable>
          {entry.duration !== undefined ? `${entry.duration}ms` : '...'} ·{' '}
          {new Date(entry.startedAt).toLocaleTimeString()}
        </Text>
      </View>

      {bigRows && (
        <Text style={styles.cardName} numberOfLines={1} selectable>
          {getDisplayNameWithQuery(entry.url)}
        </Text>
      )}
      <Text
        style={[styles.cardUrl, !bigRows && styles.cardUrlPrimary]}
        numberOfLines={2}
        selectable>
        {entry.url}
      </Text>

      {bigRows && (
        <View style={styles.badgeRow}>
          <InfoBadge
            icon={RESOURCE_TYPE_ICONS[resourceType]}
            label={RESOURCE_TYPE_LABELS[resourceType]}
          />
          {entry.source && <InfoBadge icon="hub" label={entry.source} />}
          <InfoBadge icon="data-usage" label={formatSize(entry.size)} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 10,
    marginTop: 8,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  cardBig: {
    padding: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  methodPill: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  methodPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  statusPill: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timing: {
    flex: 1,
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  cardName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cardUrl: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  cardUrlPrimary: {
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
