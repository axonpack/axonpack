import type { AgentTopic } from '../../../agent/constants/agent-topics.const';
import { formatFrameLocation } from '../../../core/utils/frame-location.util';
import { maskNetworkEntryForAgent } from '../services/redact-network.service';
import {
  networkLogStore,
  type NetworkEntry,
  type ServerSentEvent,
  type WebSocketMessage,
} from '../stores/network-log.store';

/** A row with its socket frames or stream events beside it, so `get` and `--grep` reach them. */
type NetworkAgentRow = NetworkEntry & {
  messages?: readonly WebSocketMessage[];
  events?: readonly ServerSentEvent[];
};

function toAgentRow(entry: NetworkEntry): NetworkAgentRow {
  const row = maskNetworkEntryForAgent(entry);
  if (row.kind === 'websocket') {
    return { ...row, messages: networkLogStore.getWebSocketMessages(row.id) };
  }
  return row.eventStream ? { ...row, events: networkLogStore.getStreamEvents(row.id) } : row;
}

export const NETWORK_AGENT: AgentTopic<NetworkAgentRow> = {
  name: 'network',
  about: 'HTTP, WebSocket and SSE since launch, newest first; get shows frames and events',
  rows: () => networkLogStore.getMergedSnapshot().map(toAgentRow),
  enabled: networkLogStore.isEnabled,
  fields: {
    id: (e) => e.id,
    t: (e) => e.startedAt,
    kind: (e) => (e.kind === 'websocket' ? 'ws' : e.eventStream ? 'sse' : 'http'),
    method: (e) => e.method,
    code: (e) => (e.kind === 'http' ? e.statusCode : e.closeCode),
    state: (e) => e.status,
    ms: (e) => e.duration,
    url: (e) => e.url,
    error: (e) => e.error,
    type: (e) => (e.kind === 'http' ? e.mimeType : undefined),
    size: (e) => (e.kind === 'http' ? e.size : undefined),
    msgs: (e) => (e.messages ?? e.events)?.length,
    source: (e) => e.source,
    request: (e) => (e.kind === 'http' ? e.requestBody : undefined),
    response: (e) => (e.kind === 'http' ? e.responseBody : undefined),
  },
  show: ['id', 'method', 'code', 'ms', 'url'],
  // Each frame's location is the whole bundle URL with Metro's query, so `get` keeps the file and
  // position as the panel shows them, and the vendor frames only with `--full`.
  detail: (e, full) =>
    e.kind === 'http' && e.initiator
      ? {
          ...e,
          initiator: e.initiator
            .filter((frame) => full || !frame.vendor)
            .map((frame) => ({ ...frame, location: formatFrameLocation(frame.location) })),
        }
      : e,
  // Pending only while the code or the outcome can still change. A stream already has its code,
  // and an open socket can stay open all session, so neither may hold the `next` cursor back.
  pending: (e) =>
    e.kind === 'http' ? e.status === 'pending' && !e.eventStream : e.status === 'connecting',
};
