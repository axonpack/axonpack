import {
  networkLogStore,
  useNetworkLogStore,
  type NetworkLogEntry,
} from '../../../../features/network/stores/network-log.store';
import { DataTable } from '../data-table.component';

/** Bounded for the same reason the app's is: every row crosses to the page, and a stream runs on. */
const MAX_VISIBLE_EVENTS = 200;

/** Chrome's EventStream table, newest last as Chrome keeps it, and live while the stream is open. */
export function EventsTab({ entry }: { entry: NetworkLogEntry }) {
  const events = useNetworkLogStore(() => networkLogStore.getStreamEvents(entry.id));

  if (events.length === 0) {
    return (
      <p className="axonpack-net-none">
        {entry.bodyOmitted === 'unreadable'
          ? 'This stream could not be read on this runtime, so its events were never parsed.'
          : 'No events yet.'}
      </p>
    );
  }

  const visible = events.slice(-MAX_VISIBLE_EVENTS);

  return (
    <div>
      {events.length > visible.length && (
        <p className="axonpack-net-none">
          Showing the last {visible.length} of {events.length} events.
        </p>
      )}
      <DataTable
        flex={2}
        columns={[
          { label: 'Id', width: 60 },
          { label: 'Type', width: 90 },
          { label: 'Data', width: 0 },
          { label: 'Time', width: 90 },
        ]}
        rows={visible.map((event) => ({
          key: event.id,
          cells: [
            event.lastEventId ?? '',
            event.type,
            event.data,
            new Date(event.timestamp).toLocaleTimeString(),
          ],
        }))}
      />
    </div>
  );
}
