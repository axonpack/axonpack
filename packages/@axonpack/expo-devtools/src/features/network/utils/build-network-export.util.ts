import type {
  NetworkEntry,
  NetworkLogEntry,
  ServerSentEvent,
  WebSocketLogEntry,
  WebSocketMessage,
} from '../stores/network-log.store';

/**
 * Bumped when the shape below changes in a way something reading an old file would notice. A file
 * that says which version it is can be read years later; one that does not is a guess.
 */
export const NETWORK_EXPORT_SCHEMA_VERSION = 1;

type ExportedRequest = Omit<NetworkLogEntry, 'kind' | 'responseBase64' | 'conditions'> & {
  type: 'http';
  /** Present only for a stream, and then it is the body: see the omission note below. */
  events?: ServerSentEvent[];
  /**
   * Set when a response came back as bytes. The bytes themselves are left out on purpose — a base64
   * copy of a video makes the file too big to open, and the panel already declines to hold one past
   * its own ceiling.
   */
  responseBytesOmitted?: true;
};

type ExportedSocket = Omit<WebSocketLogEntry, 'kind'> & {
  type: 'websocket';
  /** Joined in from the store, where a socket's messages live beside the entry rather than on it. */
  messages: WebSocketMessage[];
};

export type ExportedEntry = ExportedRequest | ExportedSocket;

export type NetworkExport = {
  schemaVersion: typeof NETWORK_EXPORT_SCHEMA_VERSION;
  tool: '@axonpack/expo-devtools';
  exportedAt: string;
  /** What is in the file, so it can be sized up without being read. */
  summary: {
    requests: number;
    sockets: number;
    streams: number;
    socketMessages: number;
    streamEvents: number;
  };
  entries: ExportedEntry[];
};

/** The two side lookups the store keeps, passed in so this stays a pure function of its inputs. */
export type ExportLookups = {
  messagesFor: (id: string) => readonly WebSocketMessage[];
  eventsFor: (id: string) => readonly ServerSentEvent[];
};

function exportRequest(entry: NetworkLogEntry, lookups: ExportLookups): ExportedRequest {
  // Destructured away rather than deleted: `kind` is the store's own discriminator and `conditions`
  // are the panel's settings, neither of which means anything to whoever opens the file.
  const { kind: _kind, responseBase64, conditions: _conditions, ...rest } = entry;

  const events = entry.eventStream ? [...lookups.eventsFor(entry.id)] : undefined;

  return {
    type: 'http',
    ...rest,
    ...(responseBase64 === undefined ? null : { responseBytesOmitted: true as const }),
    ...(events === undefined ? null : { events }),
  };
}

function exportSocket(entry: WebSocketLogEntry, lookups: ExportLookups): ExportedSocket {
  const { kind: _kind, ...rest } = entry;

  return { type: 'websocket', ...rest, messages: [...lookups.messagesFor(entry.id)] };
}

/**
 * The log as a file: every kind of entry it holds, each with the traffic that belongs to it, under a
 * version and a summary.
 *
 * Sockets and streams used to be dropped — the export filtered to plain requests, so a socket never
 * appeared and a stream arrived as a row with its events missing. Both carry what they recorded now,
 * which means the join to the store's side maps happens here rather than being lost.
 */
export function buildNetworkExport(
  entries: readonly NetworkEntry[],
  lookups: ExportLookups,
  exportedAt: string
): NetworkExport {
  const exported = entries.map((entry) =>
    entry.kind === 'websocket' ? exportSocket(entry, lookups) : exportRequest(entry, lookups)
  );

  return {
    schemaVersion: NETWORK_EXPORT_SCHEMA_VERSION,
    tool: '@axonpack/expo-devtools',
    exportedAt,
    summary: {
      requests: exported.filter((entry) => entry.type === 'http' && entry.events === undefined)
        .length,
      sockets: exported.filter((entry) => entry.type === 'websocket').length,
      streams: exported.filter((entry) => entry.type === 'http' && entry.events !== undefined)
        .length,
      socketMessages: exported.reduce(
        (total, entry) => total + (entry.type === 'websocket' ? entry.messages.length : 0),
        0
      ),
      streamEvents: exported.reduce(
        (total, entry) => total + (entry.type === 'http' ? (entry.events?.length ?? 0) : 0),
        0
      ),
    },
    entries: exported,
  };
}
