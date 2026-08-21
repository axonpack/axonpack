import { EventEmitter } from 'expo';

import type { ResolvedNetworkConditions } from './network-conditions.store';
import type { StackFrame } from '../../../core/utils/parse-stack.util';
import type { RequestField } from '../utils/request-body.util';

export type NetworkLogStatus = 'pending' | 'success' | 'error';

/**
 * The phases of a request as the native HTTP stack timed them, in milliseconds. Every one is optional
 * because each comes from a callback the platform only makes when that phase happened: a reused
 * connection has no DNS, TCP or TLS phase at all, and a plain-HTTP request has no TLS.
 */
export type NetworkPhases = {
  /** Waiting for the stack to start work on it — the connection pool and the request queue. */
  queuedMs?: number;
  dnsMs?: number;
  tcpMs?: number;
  tlsMs?: number;
  /** Sending the request, headers and body. */
  sendMs?: number;
  /** Sent, waiting for the first byte back. */
  waitMs?: number;
  downloadMs?: number;
  /** No connection phases means the socket was already open, which is worth saying rather than
   * leaving three blanks that read like a failure to measure. */
  reusedConnection?: boolean;
  /** `h2`, `http/1.1` — whatever the stack negotiated. */
  protocol?: string;
  /** Which stack measured this. Only some of an app's traffic goes through each one. */
  measuredBy: 'urlsession' | 'okhttp';
};

export type NetworkLogEntry = {
  /** Discriminates a request from a socket in the one list the tab shows. */
  kind: 'http';
  id: string;
  method: string;
  url: string;
  status: NetworkLogStatus;
  statusCode?: number;
  statusText?: string;
  requestBody?: string;
  /** The parts of a form-data body, where a one-line preview cannot show what was uploaded. */
  requestFields?: RequestField[];
  responseBody?: string;
  /**
   * A response that is not text, base64-encoded. Kept beside `responseBody` rather than replacing it,
   * because a text body is what almost every request has and reading it should stay direct.
   */
  responseBase64?: string;
  /**
   * Why the body is absent, when it is. Said out loud rather than left as an empty pane: a response
   * too big to keep and one that could not be read are different facts, and both are worth knowing.
   */
  bodyOmitted?: 'too-large' | 'unreadable';
  error?: string;
  startedAt: number;
  duration?: number;
  /** Time until the response headers arrived — the wait, as opposed to the body download. */
  ttfb?: number;
  /** An aborted request is not a failed one, and the difference is usually the app's own doing. */
  canceled?: boolean;
  /**
   * How far the body has got while the request is still in flight. The latest reading only, which is
   * what a progress bar needs; `total` is absent when nothing declared a length.
   */
  progress?: { direction: 'upload' | 'download'; loaded: number; total?: number };

  source?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;

  mimeType?: string;

  size?: number;

  conditions?: ResolvedNetworkConditions;

  /** Set when the panel stood in for the server, so a row never passes off a rule as a real answer. */
  intercepted?: 'blocked' | 'overridden';

  /**
   * The bytes the platform counted on the socket and after decoding. Measured rather than inferred,
   * which is what makes a compression ratio worth showing — `size` above cannot be both numbers.
   */
  transfer?: { wireBytes?: number; decodedBytes?: number };

  /**
   * What the platform's own networking stack measured, for the requests that go through one this
   * package can reach. Absent for everything else, and never inferred from the two numbers a patch
   * can see — a phase this did not measure is missing rather than zero.
   */
  phases?: NetworkPhases;

  /**
   * Set when the response came back as `text/event-stream`. The row stays one HTTP request, because
   * on the wire that is what it is — the events live beside it the way a socket's messages do, and
   * the raw stream is not kept as a body: it has no size, and the events are the readable form of it.
   */
  eventStream?: boolean;

  /**
   * The call stack as it was when the request went out, unsymbolicated. Kept raw because turning it
   * into file names needs the dev server, which is a cost worth paying only for the one request
   * somebody opens.
   */
  initiator?: StackFrame[];
};

export type WebSocketStatus = 'connecting' | 'open' | 'closing' | 'closed' | 'error';

export type WebSocketMessage = {
  id: string;
  direction: 'sent' | 'received';
  data: string;
  /** A blob arrives as `binary`: only its bytes are relayed, never a `Blob` we could re-read. */
  messageType: 'text' | 'binary';
  timestamp: number;
};

/** One dispatched event out of a `text/event-stream` response. */
export type ServerSentEvent = {
  id: string;
  /** `message` unless the block named one, exactly as `EventSource` would have dispatched it. */
  type: string;
  data: string;
  /** The stream's own `id:`, when it sent one — what a client would resume from. */
  lastEventId?: string;
  timestamp: number;
};

export type WebSocketLogEntry = {
  kind: 'websocket';
  id: string;
  /**
   * Always `WS`. A socket has no HTTP method, but the list, the grouping and the method filter all
   * read this field, and a socket is a row in that same list.
   */
  method: 'WS';
  source?: string;
  /** React Native's own handle for the socket, which is what its native events are keyed by. */
  socketId: number;
  url: string;
  protocols?: string[];
  status: WebSocketStatus;
  startedAt: number;
  duration?: number;
  closeCode?: number;
  closeReason?: string;
  error?: string;
};

export type NetworkEntry = NetworkLogEntry | WebSocketLogEntry;

type NetworkLogEvents = {
  change: () => void;
};

const MAX_ENTRIES = 200;
/**
 * Per socket, not for the log as a whole. A request has one body and stops; a socket can carry
 * messages for as long as the app is open, so this is the one place in this tab where something is
 * dropped rather than kept whole.
 */
const MAX_MESSAGES_PER_SOCKET = 1000;

/** The same ceiling, for the same reason: a stream can run for as long as the app is open. */
const MAX_EVENTS_PER_STREAM = 1000;

/** Returned for a socket nobody has sent on, so the reference stays stable between renders. */
const NO_MESSAGES: readonly WebSocketMessage[] = [];

/** The same, for a stream that has not dispatched anything yet. */
const NO_EVENTS: readonly ServerSentEvent[] = [];

let entries: NetworkLogEntry[] = [];
let socketEntries: WebSocketLogEntry[] = [];
let socketMessages = new Map<string, WebSocketMessage[]>();
let streamEvents = new Map<string, ServerSentEvent[]>();
/**
 * Rebuilt on every change rather than derived per read: `useSyncExternalStore` compares snapshots by
 * identity, so a fresh array out of the getter would re-render for ever.
 */
let mergedEntries: NetworkEntry[] = [];

function remerge() {
  mergedEntries = [...entries, ...socketEntries].sort((a, b) => b.startedAt - a.startedAt);
}
let paused = false;
let preserveLog = true;

let enabled = false;
const emitter = new EventEmitter<NetworkLogEvents>();

export const networkLogStore = {
  getSnapshot(): NetworkLogEntry[] {
    return entries;
  },
  /** Requests and sockets in one list, newest first — what the tab renders. */
  getMergedSnapshot(): NetworkEntry[] {
    return mergedEntries;
  },
  isPaused(): boolean {
    return paused;
  },
  isPreserveLogEnabled(): boolean {
    return preserveLog;
  },
  isEnabled(): boolean {
    return enabled;
  },
  subscribe(listener: () => void) {
    const subscription = emitter.addListener('change', listener);
    return () => subscription.remove();
  },
  setEnabled(nextEnabled: boolean) {
    enabled = nextEnabled;
    emitter.emit('change');
  },
  setPaused(nextPaused: boolean) {
    paused = nextPaused;
    emitter.emit('change');
  },
  setPreserveLog(nextPreserveLog: boolean) {
    preserveLog = nextPreserveLog;
    emitter.emit('change');
  },
  notifyNavigation() {
    if (!preserveLog) {
      entries = [];
      socketEntries = [];
      socketMessages = new Map();
      streamEvents = new Map();
      remerge();
      emitter.emit('change');
    }
  },
  add(entry: Omit<NetworkLogEntry, 'kind'>) {
    if (!enabled || paused) return;
    entries = [{ ...entry, kind: 'http' as const }, ...entries].slice(0, MAX_ENTRIES);
    remerge();
    emitter.emit('change');
  },
  getWebSocketSnapshot(): WebSocketLogEntry[] {
    return socketEntries;
  },
  getWebSocketMessages(id: string): readonly WebSocketMessage[] {
    return socketMessages.get(id) ?? NO_MESSAGES;
  },
  addWebSocket(entry: Omit<WebSocketLogEntry, 'kind'>) {
    if (!enabled || paused) return;
    socketEntries = [{ ...entry, kind: 'websocket' as const }, ...socketEntries].slice(
      0,
      MAX_ENTRIES
    );
    remerge();
    emitter.emit('change');
  },
  /**
   * Deliberately not gated on `paused`: a socket opened while recording lives on, and dropping the
   * close event for it would leave a connection that never ends.
   */
  updateWebSocket(id: string, patch: Partial<Omit<WebSocketLogEntry, 'kind' | 'id'>>) {
    if (!enabled) return;
    let changed = false;
    socketEntries = socketEntries.map((entry) => {
      if (entry.id !== id) return entry;
      changed = true;
      return { ...entry, ...patch };
    });
    if (changed) {
      remerge();
      emitter.emit('change');
    }
  },
  addWebSocketMessage(id: string, message: WebSocketMessage) {
    if (!enabled || paused) return;
    const existing = socketMessages.get(id) ?? [];
    const next = [...existing, message];
    socketMessages = new Map(socketMessages).set(
      id,
      next.length > MAX_MESSAGES_PER_SOCKET ? next.slice(-MAX_MESSAGES_PER_SOCKET) : next
    );
    // The row for a socket shows how many messages it has carried, so the list snapshot has to
    // change too — otherwise that count is read once and never again.
    remerge();
    emitter.emit('change');
  },
  getStreamEvents(id: string): readonly ServerSentEvent[] {
    return streamEvents.get(id) ?? NO_EVENTS;
  },
  /**
   * Keyed by the id of the request the stream arrived on, since a stream *is* that request — there is
   * no second entry to hang it off, which is the one way this differs from a socket's messages.
   */
  addStreamEvent(id: string, event: ServerSentEvent) {
    if (!enabled || paused) return;
    const existing = streamEvents.get(id) ?? [];
    const next = [...existing, event];
    streamEvents = new Map(streamEvents).set(
      id,
      next.length > MAX_EVENTS_PER_STREAM ? next.slice(-MAX_EVENTS_PER_STREAM) : next
    );
    // The row shows how many events have arrived, so the list snapshot has to change with it.
    remerge();
    emitter.emit('change');
  },
  update(id: string, patch: Partial<NetworkLogEntry>) {
    if (!enabled) return;
    entries = entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry));
    remerge();
    emitter.emit('change');
  },
  clear() {
    entries = [];
    socketEntries = [];
    socketMessages = new Map();
    streamEvents = new Map();
    remerge();
    emitter.emit('change');
  },
};
