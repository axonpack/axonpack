import {
  networkLogStore,
  useNetworkLogStore,
  type WebSocketLogEntry,
} from '../../../../features/network/stores/network-log.store';
import { DataTable } from '../data-table.component';

/**
 * A socket's messages, oldest first as they happened, and live while it is open. The app's arrows
 * say which way each went, up for sent and down for received, drawn by the CSS from `tone`. Binary
 * frames say so, as the app's BIN marker does.
 */
export function MessagesTab({ entry }: { entry: WebSocketLogEntry }) {
  const messages = useNetworkLogStore(() => networkLogStore.getWebSocketMessages(entry.id));

  if (messages.length === 0) return <p className="axonpack-net-none">No messages yet.</p>;

  return (
    <DataTable
      flex={0}
      columns={[
        { label: 'Data', width: 0 },
        { label: 'Length', width: 70 },
        { label: 'Time', width: 90 },
      ]}
      rows={messages.map((message) => ({
        key: message.id,
        tone: message.direction,
        cells: [
          `${message.messageType === 'binary' ? '[BIN] ' : ''}${message.data}`,
          String(message.data.length),
          new Date(message.timestamp).toLocaleTimeString(),
        ],
      }))}
    />
  );
}
