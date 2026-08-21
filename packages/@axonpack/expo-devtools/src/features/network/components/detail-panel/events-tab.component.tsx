import { useSyncExternalStore } from 'react';
import { Text, View } from 'react-native';

import { useRowStyles } from './shared.styles';
import { StreamEventRow } from './stream-event-row.component';
import { makeThemedStyles } from '../../../../core/utils/themed-styles.util';
import { networkLogStore, type NetworkLogEntry } from '../../stores/network-log.store';

/**
 * This tab lives inside the sheet's own ScrollView rather than a list of its own, so what it renders
 * is bounded — every row of a thousand-event stream would be mounted at once otherwise. The count is
 * said out loud, because a cap nobody mentions reads as "this is all of it".
 */
const MAX_VISIBLE_EVENTS = 200;

export function EventsTab({ entry }: { entry: NetworkLogEntry }) {
  const rowStyles = useRowStyles();
  const styles = useStyles();
  // Subscribed rather than passed in: a stream is open while this is on screen, which is the whole
  // reason it is a stream.
  const events = useSyncExternalStore(networkLogStore.subscribe, () =>
    networkLogStore.getStreamEvents(entry.id)
  );

  if (events.length === 0) {
    return (
      <View style={rowStyles.section}>
        <Text style={rowStyles.emptyText}>
          {entry.bodyOmitted === 'unreadable'
            ? 'This stream could not be read on this runtime, so its events were never parsed. A stream opened through XMLHttpRequest is read as text and does not need a decoder.'
            : 'No events yet.'}
        </Text>
      </View>
    );
  }

  const visible = events.slice(-MAX_VISIBLE_EVENTS).reverse();

  return (
    <View style={rowStyles.section}>
      <Text style={styles.count}>
        {events.length} event{events.length === 1 ? '' : 's'}, newest first
        {events.length > visible.length ? ` — showing the last ${visible.length}` : ''}
      </Text>
      {visible.map((event) => (
        <StreamEventRow key={event.id} event={event} />
      ))}
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  count: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
}));
