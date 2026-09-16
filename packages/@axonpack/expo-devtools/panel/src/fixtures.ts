/**
 * Static stand-ins for what the on-device store holds.
 *
 * The shapes mirror `NetworkLogEntry`, `WebSocketLogEntry`, `WebSocketMessage` and `ServerSentEvent`
 * in the package's own network store, so wiring this to the real data later is a matter of deleting
 * this file rather than reworking the page.
 */

export type Phases = {
  queuedMs?: number;
  dnsMs?: number;
  tcpMs?: number;
  tlsMs?: number;
  sendMs?: number;
  waitMs?: number;
  downloadMs?: number;
  reusedConnection?: boolean;
  protocol?: string;
  totalMs?: number;
  measuredBy: 'urlsession' | 'okhttp' | 'webview';
};

export type HttpEntry = {
  kind: 'http';
  id: string;
  method: string;
  url: string;
  status: 'pending' | 'success' | 'error';
  statusCode?: number;
  statusText?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  mimeType?: string;
  size?: number;
  transfer?: { wireBytes?: number; decodedBytes?: number };
  startedAt: number;
  duration?: number;
  ttfb?: number;
  canceled?: boolean;
  error?: string;
  source?: string;
  pageCookies?: string;
  conditions?: { label: string };
  intercepted?: 'blocked' | 'overridden';
  eventStream?: boolean;
  phases?: Phases;
  initiator?: { file: string; line: number; column: number; method?: string }[];
  progress?: { direction: 'upload' | 'download'; loaded: number; total?: number };
};

export type SocketEntry = {
  kind: 'websocket';
  id: string;
  method: 'WS';
  url: string;
  socketId: number;
  protocols?: string[];
  status: 'connecting' | 'open' | 'closing' | 'closed' | 'error';
  startedAt: number;
  duration?: number;
  closeCode?: number;
  closeReason?: string;
  source?: string;
};

export type Entry = HttpEntry | SocketEntry;

export type SocketMessage = {
  id: string;
  direction: 'sent' | 'received';
  data: string;
  messageType: 'text' | 'binary';
  timestamp: number;
};

export type StreamEvent = {
  id: string;
  type: string;
  data: string;
  lastEventId?: string;
  timestamp: number;
};

const T0 = Date.parse('2026-09-16T10:04:11.000Z');

export const ENTRIES: Entry[] = [
  {
    kind: 'http',
    id: 'r1',
    method: 'GET',
    url: 'https://api.example.com/v1/patients?ward=3&page=1',
    status: 'success',
    statusCode: 200,
    statusText: 'OK',
    mimeType: 'application/json',
    size: 18422,
    transfer: { wireBytes: 4120, decodedBytes: 18422 },
    startedAt: T0,
    duration: 1114,
    ttfb: 889,
    source: 'native',
    requestHeaders: {
      accept: 'application/json',
      authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.redacted',
      'accept-encoding': 'gzip, deflate, br',
      cookie: 'session=9f2c1a; theme=dark',
    },
    responseHeaders: {
      'content-type': 'application/json; charset=utf-8',
      'content-encoding': 'gzip',
      'content-length': '4120',
      'cache-control': 'private, max-age=30',
      'set-cookie': 'session=9f2c1a; Path=/; HttpOnly; SameSite=Lax',
    },
    responseBody: JSON.stringify(
      {
        page: 1,
        total: 128,
        patients: [
          { id: 'p-1001', name: 'A. Lovelace', ward: 3, admitted: '2026-09-14', stable: true },
          { id: 'p-1002', name: 'G. Hopper', ward: 3, admitted: '2026-09-15', stable: true },
          { id: 'p-1003', name: 'K. Johnson', ward: 3, admitted: '2026-09-16', stable: false },
        ],
      },
      null,
      2
    ),
    phases: {
      queuedMs: 12,
      dnsMs: 31,
      tcpMs: 48,
      tlsMs: 96,
      sendMs: 3,
      waitMs: 698,
      downloadMs: 115,
      protocol: 'h2',
      totalMs: 1114,
      measuredBy: 'urlsession',
    },
    initiator: [
      { file: 'src/api/patients.ts', line: 42, column: 18, method: 'listPatients' },
      { file: 'src/screens/WardScreen.tsx', line: 88, column: 6, method: 'WardScreen' },
    ],
  },
  {
    kind: 'http',
    id: 'r2',
    method: 'POST',
    url: 'https://api.example.com/v1/observations',
    status: 'error',
    statusCode: 422,
    statusText: 'Unprocessable Entity',
    mimeType: 'application/json',
    size: 184,
    startedAt: T0 + 1400,
    duration: 233,
    ttfb: 210,
    source: 'native',
    requestHeaders: { 'content-type': 'application/json' },
    responseHeaders: { 'content-type': 'application/json' },
    requestBody: JSON.stringify({ patientId: 'p-1003', temperature: null, pulse: 74 }, null, 2),
    responseBody: JSON.stringify(
      { error: 'validation_failed', fields: { temperature: 'required' } },
      null,
      2
    ),
    phases: {
      queuedMs: 4,
      sendMs: 2,
      waitMs: 205,
      downloadMs: 22,
      reusedConnection: true,
      protocol: 'h2',
      totalMs: 233,
      measuredBy: 'urlsession',
    },
    initiator: [{ file: 'src/api/observations.ts', line: 17, column: 10, method: 'submit' }],
  },
  {
    kind: 'http',
    id: 'r3',
    method: 'GET',
    url: 'https://cdn.example.com/avatars/p-1001.png',
    status: 'success',
    statusCode: 200,
    mimeType: 'image/png',
    size: 20480,
    startedAt: T0 + 1750,
    duration: 96,
    ttfb: 61,
    source: 'native',
    responseHeaders: { 'content-type': 'image/png', 'content-length': '20480' },
    phases: {
      dnsMs: 18,
      tcpMs: 22,
      tlsMs: 30,
      waitMs: 14,
      downloadMs: 12,
      protocol: 'http/1.1',
      totalMs: 96,
      measuredBy: 'okhttp',
    },
  },
  {
    kind: 'http',
    id: 'r4',
    method: 'GET',
    url: 'https://api.example.com/v1/alerts/stream',
    status: 'success',
    statusCode: 200,
    mimeType: 'text/event-stream',
    eventStream: true,
    startedAt: T0 + 2100,
    duration: 42,
    source: 'native',
    responseHeaders: { 'content-type': 'text/event-stream', 'cache-control': 'no-store' },
  },
  {
    kind: 'http',
    id: 'r5',
    method: 'PUT',
    url: 'https://api.example.com/v1/patients/p-1002/notes',
    status: 'pending',
    startedAt: T0 + 3200,
    source: 'native',
    progress: { direction: 'upload', loaded: 184320, total: 512000 },
    requestHeaders: { 'content-type': 'multipart/form-data; boundary=----axonpack' },
  },
  {
    kind: 'http',
    id: 'r6',
    method: 'GET',
    url: 'https://tiles.example.com/hospital/12/2048/1362.webp',
    status: 'error',
    error: 'The request timed out.',
    startedAt: T0 + 3400,
    duration: 30012,
    source: 'checkout',
    pageCookies: 'tileSession=ab12; consent=1',
  },
  {
    kind: 'http',
    id: 'r7',
    method: 'GET',
    url: 'https://api.example.com/v1/config',
    status: 'success',
    statusCode: 200,
    statusText: 'OK',
    mimeType: 'application/json',
    size: 96,
    startedAt: T0 + 3600,
    duration: 4,
    source: 'native',
    intercepted: 'overridden',
    responseBody: JSON.stringify({ featureFlags: { newVitals: true } }, null, 2),
    responseHeaders: { 'content-type': 'application/json' },
  },
  {
    kind: 'websocket',
    id: 'ws-7',
    method: 'WS',
    url: 'wss://api.example.com/v1/ward/3/live',
    socketId: 7,
    protocols: ['ward.v2'],
    status: 'open',
    startedAt: T0 + 220,
    source: 'native',
  },
];

export const SOCKET_MESSAGES: Record<string, SocketMessage[]> = {
  'ws-7': [
    {
      id: 'm1',
      direction: 'sent',
      data: '{"type":"subscribe","ward":3}',
      messageType: 'text',
      timestamp: T0 + 240,
    },
    {
      id: 'm2',
      direction: 'received',
      data: '{"type":"ack","ward":3}',
      messageType: 'text',
      timestamp: T0 + 268,
    },
    {
      id: 'm3',
      direction: 'received',
      data: '{"type":"vitals","patientId":"p-1003","pulse":118}',
      messageType: 'text',
      timestamp: T0 + 1910,
    },
    {
      id: 'm4',
      direction: 'received',
      data: '[binary]',
      messageType: 'binary',
      timestamp: T0 + 2400,
    },
    {
      id: 'm5',
      direction: 'sent',
      data: '{"type":"ping"}',
      messageType: 'text',
      timestamp: T0 + 3000,
    },
  ],
};

export const STREAM_EVENTS: Record<string, StreamEvent[]> = {
  r4: [
    {
      id: 'e1',
      type: 'alert',
      data: '{"patientId":"p-1003","level":"high"}',
      lastEventId: '41',
      timestamp: T0 + 2200,
    },
    { id: 'e2', type: 'message', data: 'heartbeat', timestamp: T0 + 2600 },
    {
      id: 'e3',
      type: 'alert',
      data: '{"patientId":"p-1001","level":"low"}',
      lastEventId: '42',
      timestamp: T0 + 3100,
    },
  ],
};
