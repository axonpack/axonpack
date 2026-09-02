import { EventEmitter } from 'expo';

import type { ResolvedNetworkConditions } from './network-conditions.store';
import type { StackFrame } from '../../../core/utils/parse-stack.util';
import type { RequestField } from '../utils/request-body.util';

/**
 * Where a request got to: `'pending'` while it is in flight, `'success'` for a 2xx/3xx answer,
 * `'error'` for a 4xx/5xx one or a request that never came back. What colours a row in the tab.
 */
export type NetworkLogStatus = 'pending' | 'success' | 'error';

/**
 * The phases of a request as the native HTTP stack timed them, in milliseconds. Every one is optional
 * because each comes from a callback the platform only makes when that phase happened: a reused
 * connection has no DNS, TCP or TLS phase at all, and a plain-HTTP request has no TLS.
 */
export type NetworkPhases = {
  /** Waiting for the stack to start work on it — the connection pool and the request queue. */
  queuedMs?: number;
  /** Resolving the host name, in milliseconds. Absent on a reused connection. */
  dnsMs?: number;
  /** Opening the socket, in milliseconds. Absent on a reused connection. */
  tcpMs?: number;
  /** The TLS handshake, in milliseconds. Absent on plain HTTP and on a reused connection. */
  tlsMs?: number;
  /** Sending the request, headers and body. */
  sendMs?: number;
  /** Sent, waiting for the first byte back. */
  waitMs?: number;
  /** Reading the response body, in milliseconds. */
  downloadMs?: number;
  /** No connection phases means the socket was already open, which is worth saying rather than
   * leaving three blanks that read like a failure to measure. */
  reusedConnection?: boolean;
  /** `h2`, `http/1.1` — whatever the stack negotiated. */
  protocol?: string;
  /**
   * The whole request as the platform timed it, which is deliberately *not* the phases added up: the
   * stack leaves time attributed to no phase at all — between a lookup finishing and a connection
   * starting, between a connection being ready and the request going out. Keeping it means the
   * waterfall scales to the real duration and that time shows as the gap it is.
   */
  totalMs?: number;
  /** Which stack measured this. Only some of an app's traffic goes through each one. */
  measuredBy: 'urlsession' | 'okhttp' | 'webview';
};

/**
 * One captured request — an HTTP row in the Network tab. Read them with
 * `devtools.networkLogStore.getSnapshot()`; the store keeps the most recent 200, and bodies are
 * kept whole rather than truncated.
 */
export type NetworkLogEntry = {
  /** Discriminates a request from a socket in the one list the tab shows. */
  kind: 'http';
  /** Unique id for this row, stable for as long as it is in the buffer. */
  id: string;
  /** HTTP method, upper-case — `GET`, `POST`. */
  method: string;
  /** The absolute URL, with a page's relative path already resolved against its own location. */
  url: string;
  /** Where the request got to. */
  status: NetworkLogStatus;
  /** The response's status code. Absent until the response arrives, or if it never did. */
  statusCode?: number;
  /** The status line's reason phrase, when the stack reported one. */
  statusText?: string;
  /** The request body as text, whole. Absent for a request that had none. */
  requestBody?: string;
  /** The parts of a form-data body, where a one-line preview cannot show what was uploaded. */
  requestFields?: RequestField[];
  /** The response body as text, whole. Absent for a binary response — see `responseBase64`. */
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
  /** The failure message, for a request that never produced a response. */
  error?: string;
  /** When the request went out, as `Date.now()` milliseconds. Sorts the list. */
  startedAt: number;
  /** End-to-end time in milliseconds. Absent while the request is still in flight. */
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

  /**
   * Which WebView made it — the `webviewSources` name. Absent for the app's own requests.
   */
  source?: string;
  /**
   * What `document.cookie` held in the page when it made the request. Not the cookies the request
   * *sent*: the engine writes that header itself and forbids JavaScript from reading it, and an
   * HttpOnly cookie is invisible to a page by design. Kept separate from the headers for that reason.
   */
  pageCookies?: string;
  /** Request headers, lower-cased keys. Absent when the transport did not expose them. */
  requestHeaders?: Record<string, string>;
  /** Response headers, lower-cased keys. */
  responseHeaders?: Record<string, string>;
  /** The response's content type, without parameters — `application/json`. */
  mimeType?: string;
  /** Response body size in bytes, as the row reports it. See `transfer` for wire vs decoded. */
  size?: number;
  /**
   * The network conditions in force when this request went out, so a slow row can be read as
   * throttled rather than slow. Absent when nothing was being simulated.
   */
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

/** A socket's state, mirroring `WebSocket.readyState`, with `'error'` for one that failed. */
export type WebSocketStatus = 'connecting' | 'open' | 'closing' | 'closed' | 'error';

/** One frame on a WebSocket, listed under that connection's Events tab. */
export type WebSocketMessage = {
  /** Unique id for this frame. */
  id: string;
  /** Which way it went, from the app's point of view. */
  direction: 'sent' | 'received';
  /** The frame's payload as text; a binary frame arrives as its decoded bytes. */
  data: string;
  /** A blob arrives as `binary`: only its bytes are relayed, never a `Blob` we could re-read. */
  messageType: 'text' | 'binary';
  /** When it was sent or received, as `Date.now()` milliseconds. */
  timestamp: number;
};

/** One dispatched event out of a `text/event-stream` response. */
export type ServerSentEvent = {
  /** Unique id for this event — not the stream's own `id:`, which is `lastEventId`. */
  id: string;
  /** `message` unless the block named one, exactly as `EventSource` would have dispatched it. */
  type: string;
  /** The event's `data:` payload, with multi-line blocks already joined. */
  data: string;
  /** The stream's own `id:`, when it sent one — what a client would resume from. */
  lastEventId?: string;
  /** When it was dispatched, as `Date.now()` milliseconds. */
  timestamp: number;
};

/**
 * One captured WebSocket connection — a `WS` row in the Network tab. Its frames are held apart, and
 * read with `devtools.networkLogStore.getSocketMessages(id)`.
 */
export type WebSocketLogEntry = {
  /** Discriminates a socket from a request in the one list the tab shows. */
  kind: 'websocket';
  /** Unique id for this row, stable for as long as it is in the buffer. */
  id: string;
  /**
   * Always `WS`. A socket has no HTTP method, but the list, the grouping and the method filter all
   * read this field, and a socket is a row in that same list.
   */
  method: 'WS';
  /** Which WebView opened it — the `webviewSources` name. Absent for the app's own sockets. */
  source?: string;
  /** React Native's own handle for the socket, which is what its native events are keyed by. */
  socketId: number;
  /** The `ws://` or `wss://` URL it connected to. */
  url: string;
  /** Subprotocols offered at handshake, when any were. */
  protocols?: string[];
  /** The connection's state right now. */
  status: WebSocketStatus;
  /** When the connection was opened, as `Date.now()` milliseconds. */
  startedAt: number;
  /** How long it stayed open, in milliseconds. Absent while it still is. */
  duration?: number;
  /** The close code, once it closed — `1000` for a normal close. */
  closeCode?: number;
  /** The close reason the peer gave, when it gave one. */
  closeReason?: string;
  /** The failure message, for a socket that errored. */
  error?: string;
};

/** A row in the Network tab: either a request or a socket. Both carry a `kind` to tell them apart. */
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
