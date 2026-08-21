import { StyleSheet, Text, View } from 'react-native';

import { CopyIconButton } from '../../../../core/components/ui/copy-icon-button.ui';
import { MONOSPACE } from '../../../../core/constants/typography.const';
import { makeThemedStyles } from '../../../../core/utils/themed-styles.util';
import type { ServerSentEvent } from '../../stores/network-log.store';

/** Pretty-printed when the payload is JSON, which is what most streams carry, and left alone if not. */
function formatData(data: string): string {
  const trimmed = data.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return data;
  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2);
  } catch {
    return data;
  }
}

export function StreamEventRow({ event }: { event: ServerSentEvent }) {
  const styles = useStyles();

  return (
    <View style={styles.row}>
      <View style={styles.topRow}>
        {/* The type is what a listener was registered for, so it reads first. */}
        <Text style={styles.type} numberOfLines={1}>
          {event.type}
        </Text>
        {event.lastEventId !== undefined && (
          <Text style={styles.eventId} numberOfLines={1}>
            id {event.lastEventId}
          </Text>
        )}
        <Text style={styles.time}>{new Date(event.timestamp).toLocaleTimeString()}</Text>
        <CopyIconButton value={event.data} />
      </View>
      <Text style={styles.data} selectable>
        {formatData(event.data)}
      </Text>
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  row: {
    gap: 4,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  type: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
  },
  eventId: {
    flexShrink: 1,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  time: {
    flex: 1,
    textAlign: 'right',
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  data: {
    fontFamily: MONOSPACE,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
}));
