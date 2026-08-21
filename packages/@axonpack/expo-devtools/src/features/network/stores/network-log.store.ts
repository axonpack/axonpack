import { EventEmitter } from 'expo';

import type { ResolvedNetworkConditions } from './network-conditions.store';
import type { StackFrame } from '../../../core/utils/parse-stack.util';
import type { RequestField } from '../utils/request-body.util';

export type NetworkLogStatus = 'pending' | 'success' | 'error';

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

/** Returned for a socket nobody has sent on, so the reference stays stable between renders. */
const NO_MESSAGES: readonly WebSocketMessage[] = [];

let entries: NetworkLogEntry[] = [];
let socketEntries: WebSocketLogEntry[] = [];
let socketMessages = new Map<string, WebSocketMessage[]>();
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
    remerge();
    emitter.emit('change');
  },
};
