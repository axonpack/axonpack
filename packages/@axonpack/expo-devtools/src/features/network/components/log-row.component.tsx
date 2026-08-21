import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type GestureResponderEvent } from 'react-native';

import { ContextMenu } from '../../../core/components/ui/context-menu.ui';
import { HighlightedText } from '../../../core/components/ui/highlighted-text.ui';
import { IconButton } from '../../../core/components/ui/icon-button.ui';
import { InfoBadge } from '../../../core/components/ui/info-badge.ui';
import { JsonIcon } from '../../../core/components/ui/json-icon.ui';
import { formatSize } from '../../../core/utils/format-bytes.util';
import { findMatches, type Matcher } from '../../../core/utils/text-search.util';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import { getResponseTypeVisual, RESOURCE_TYPE_ICONS } from '../constants/resource-type-icons.const';
import type { NetworkLogEntry } from '../stores/network-log.store';
import { buildEntryCopyMenuItems } from '../utils/entry-menu-items.util';
import {
  formatSource,
  getDisplayNameWithQuery,
  getMethodColor,
  getStatusColor,
} from '../utils/formatters.util';
import { classifyResourceType, RESOURCE_TYPE_LABELS } from '../utils/resource-type.util';

/**
 * While a request is in flight its status cell has nothing to report, so it carries how far the body
 * has got instead — a percentage when a length was declared, bytes when it was not.
 */
function formatInFlight(progress: NetworkLogEntry['progress']): string {
  if (!progress) return 'PENDING';
  const arrow = progress.direction === 'upload' ? '↑' : '↓';
  if (progress.total === undefined) return `${arrow} ${formatSize(progress.loaded)}`;
  return `${arrow} ${Math.min(100, Math.round((progress.loaded / progress.total) * 100))}%`;
}

function LogRowBase({
  entry,
  bigRows,
  matcher,
  eventCount,
  onPress,
  onOverride,
}: {
  entry: NetworkLogEntry;
  bigRows: boolean;
  matcher: Matcher | null;
  /** How many events have arrived, for a row that is a stream. Passed in, as a socket's count is. */
  eventCount?: number;

  onPress: (entry: NetworkLogEntry) => void;
  onOverride?: (url: string) => void;
}) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const statusColor = getStatusColor(entry.status, entry.statusCode, COLORS);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null);

  const openMenu = (event: GestureResponderEvent) => {
    setMenuAnchor({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
  };

  const methodColor = getMethodColor(entry.method, COLORS);
  const resourceType = classifyResourceType(entry.mimeType);
  const typeVisual = getResponseTypeVisual(entry.mimeType, COLORS);
  const displayName = getDisplayNameWithQuery(entry.url);

  return (
    <TouchableOpacity
      onPress={() => onPress(entry)}
      onLongPress={openMenu}
      style={[styles.row, bigRows && styles.rowBig]}>
      <View style={styles.topRow}>
        <Text style={[styles.method, { color: methodColor }]}>{entry.method}</Text>
        <Text style={[styles.status, { color: statusColor }]}>
          {entry.status === 'pending'
            ? // An open stream is not a request part-way through its body, so it says what it is
              // rather than reporting progress towards an end it does not have.
              entry.eventStream
              ? 'STREAM'
              : formatInFlight(entry.progress)
            : (entry.statusCode ?? entry.error ?? '')}
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
          {entry.intercepted !== undefined && (
            // Said on the row itself: a rule that answered instead of the server must never read as one
            // of the server's own answers.
            <View style={styles.badges}>
              <InfoBadge
                icon={entry.intercepted === 'blocked' ? 'block' : 'edit'}
                label={entry.intercepted === 'blocked' ? 'Blocked here' : 'Overridden here'}
              />
            </View>
          )}
          {bigRows && (
            <HighlightedText
              text={displayName}
              ranges={findMatches(displayName, matcher)}
              style={styles.name}
              numberOfLines={1}
              selectable={false}
            />
          )}
          <HighlightedText
            text={entry.url}
            ranges={findMatches(entry.url, matcher)}
            style={[styles.url, !bigRows && styles.urlPrimary]}
            numberOfLines={bigRows ? 1 : 2}
            selectable={false}
          />
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
              {entry.eventStream ? (
                // In place of the size, which a stream has none of: how many events have arrived is
                // the number that moves, and the one worth watching from the list.
                <InfoBadge icon="stream" label={`${eventCount ?? 0} events`} />
              ) : (
                <InfoBadge icon="data-usage" label={formatSize(entry.size)} />
              )}
            </>
          )}
        </View>
        <IconButton name="more-vert" color={COLORS.textSecondary} hitSlop={10} onPress={openMenu} />
      </View>

      <ContextMenu
        anchor={menuAnchor}
        items={buildEntryCopyMenuItems(entry, onOverride)}
        onClose={() => setMenuAnchor(null)}
      />
    </TouchableOpacity>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
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
}));

export const LogRow = memo(
  LogRowBase,
  (prev, next) =>
    prev.bigRows === next.bigRows &&
    // Compiled once per query upstream, so identity is a safe stand-in for the query itself.
    prev.matcher === next.matcher &&
    prev.onPress === next.onPress &&
    prev.onOverride === next.onOverride &&
    prev.entry.id === next.entry.id &&
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
    prev.entry.requestBody === next.entry.requestBody &&
    prev.entry.responseBody === next.entry.responseBody &&
    prev.entry.requestHeaders === next.entry.requestHeaders &&
    // The store replaces this object on every reading, so identity is the whole comparison — leaving
    // it out froze the row at PENDING while the body was still arriving.
    prev.entry.progress === next.entry.progress &&
    prev.entry.intercepted === next.entry.intercepted &&
    prev.entry.eventStream === next.entry.eventStream &&
    // For the same reason as `progress` above: this is the number that keeps moving on an open
    // stream, and leaving it out froze the count at whatever it was when the row first rendered.
    prev.eventCount === next.eventCount
);
