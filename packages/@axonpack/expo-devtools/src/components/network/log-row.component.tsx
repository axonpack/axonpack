import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type GestureResponderEvent } from 'react-native';

import { COLORS } from '../../constants/colors.const';
import {
  getResponseTypeVisual,
  RESOURCE_TYPE_ICONS,
} from '../../constants/network/resource-type-icons.const';
import type { NetworkLogEntry } from '../../stores/network/network-log.store';
import { formatSize } from '../../utils/format-bytes.util';
import { buildEntryCopyMenuItems } from '../../utils/network/entry-menu-items.util';
import {
  formatSource,
  getDisplayNameWithQuery,
  getMethodColor,
  getStatusColor,
} from '../../utils/network/formatters.util';
import { classifyResourceType, RESOURCE_TYPE_LABELS } from '../../utils/network/resource-type.util';
import { ContextMenu } from '../ui/context-menu.ui';
import { IconButton } from '../ui/icon-button.ui';
import { InfoBadge } from '../ui/info-badge.ui';
import { JsonIcon } from '../ui/json-icon.ui';

function LogRowBase({
  entry,
  bigRows,
  onPress,
}: {
  entry: NetworkLogEntry;
  bigRows: boolean;
  /** Takes the entry back rather than closing over it, so the list can pass one stable callback. */
  onPress: (entry: NetworkLogEntry) => void;
}) {
  const statusColor = getStatusColor(entry.status, entry.statusCode);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null);

  const openMenu = (event: GestureResponderEvent) => {
    setMenuAnchor({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
  };

  const methodColor = getMethodColor(entry.method);
  const resourceType = classifyResourceType(entry.mimeType);
  const typeVisual = getResponseTypeVisual(entry.mimeType);

  return (
    <TouchableOpacity
      onPress={() => onPress(entry)}
      onLongPress={openMenu}
      style={[styles.row, bigRows && styles.rowBig]}>
      <View style={styles.topRow}>
        <Text style={[styles.method, { color: methodColor }]}>{entry.method}</Text>
        <Text style={[styles.status, { color: statusColor }]}>
          {entry.status === 'pending' ? 'PENDING' : (entry.statusCode ?? entry.error ?? '')}
        </Text>
        <Text style={styles.timing} numberOfLines={1}>
          {entry.duration !== undefined ? `${entry.duration}ms` : '–'} ·{' '}
          {new Date(entry.startedAt).toLocaleTimeString()}
        </Text>
      </View>
      <View style={styles.urlRow}>
        {typeVisual.kind === 'json' ? (
          <JsonIcon size={14} color={typeVisual.color} />
        ) : (
          <MaterialIcons
            name={typeVisual.icon}
            size={14}
            color={typeVisual.color}
            style={styles.typeIcon}
          />
        )}
        <View style={styles.urlTextGroup}>
          {bigRows && (
            <Text style={styles.name} numberOfLines={1}>
              {getDisplayNameWithQuery(entry.url)}
            </Text>
          )}
          <Text style={[styles.url, !bigRows && styles.urlPrimary]} numberOfLines={bigRows ? 1 : 2}>
            {entry.url}
          </Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.badges}>
          {bigRows && (
            <>
              <InfoBadge
                icon={RESOURCE_TYPE_ICONS[resourceType]}
                label={RESOURCE_TYPE_LABELS[resourceType]}
              />
              {entry.source && <InfoBadge icon="hub" label={formatSource(entry.source)} />}
              <InfoBadge icon="data-usage" label={formatSize(entry.size)} />
            </>
          )}
        </View>
        <IconButton name="more-vert" color={COLORS.textSecondary} hitSlop={10} onPress={openMenu} />
      </View>

      <ContextMenu
        anchor={menuAnchor}
        items={buildEntryCopyMenuItems(entry)}
        onClose={() => setMenuAnchor(null)}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  rowBig: {
    paddingVertical: 10,
  },
  // The bottom line: badges take the spare width, so the menu button lands at the trailing edge and
  // stays vertically centred against them whether any badges are showing or not.
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  badges: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
});

/**
 * The log holds up to 200 of these, each composing badges, icons and a context menu, so the comparison
 * below names every field the row depends on. Two groups, and the second is the one that bites:
 *
 * - **Rendered** — what you can see on the row. Getting one wrong shows visibly stale data.
 * - **Copied** — the request/response payloads `buildEntryCopyMenuItems` turns into cURL, a fetch
 *   snippet and raw-body actions. Nothing on the row displays them, so omitting one here would fail
 *   *silently*: the row would look right and copy the body of an earlier state of the request.
 *
 * `responseHeaders` is deliberately absent — neither group reads it, so a patch carrying only headers
 * correctly skips this row. Adding a field to the row or to the copy menu means adding it here.
 */
export const LogRow = memo(
  LogRowBase,
  (prev, next) =>
    prev.bigRows === next.bigRows &&
    prev.onPress === next.onPress &&
    prev.entry.id === next.entry.id &&
    // Rendered.
    prev.entry.method === next.entry.method &&
    prev.entry.url === next.entry.url &&
    prev.entry.status === next.entry.status &&
    prev.entry.statusCode === next.entry.statusCode &&
    prev.entry.error === next.entry.error &&
    prev.entry.duration === next.entry.duration &&
    prev.entry.startedAt === next.entry.startedAt &&
    prev.entry.size === next.entry.size &&
    prev.entry.mimeType === next.entry.mimeType &&
    prev.entry.source === next.entry.source &&
    // Copied by the context menu.
    prev.entry.requestBody === next.entry.requestBody &&
    prev.entry.responseBody === next.entry.responseBody &&
    prev.entry.requestHeaders === next.entry.requestHeaders
);
