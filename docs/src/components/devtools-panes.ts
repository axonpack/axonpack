import {
  ArrowDown,
  Bookmark,
  CheckCheck,
  Database,
  Download,
  Filter,
  Gauge,
  Plus,
  Radio,
  RefreshCw,
  Settings,
  Terminal,
  TriangleAlert,
  Upload,
  type LucideIcon,
} from 'lucide-react';

/**
 * What the hero panel draws, kept apart from the drawing of it. Every screen here is modelled on the
 * real tab it names, down to which buttons that tab's toolbar carries, because the panel's whole job
 * is to be recognisable to somebody who has run the package.
 *
 * Sample data only. Nothing here is fetched and nothing is a screenshot.
 */

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'muted';

/** A line in a syntax-coloured JSON tree, the same shape the package's own viewer renders. */
export type JsonLine = {
  indent: number;
  /** Present on an object or array, which is what earns the disclosure triangle. */
  caret?: 'open' | 'closed';
  key?: string;
  value: string;
  kind?: 'string' | 'number' | 'bool' | 'null' | 'plain';
};

export type Block =
  | { kind: 'banner'; label: string; title: string }
  | { kind: 'json'; lines: JsonLine[] }
  | { kind: 'rows'; rows: [string, string][] }
  | { kind: 'stack'; frames: [string, string][] }
  | { kind: 'charts'; charts: Chart[] };

export type Chart = {
  title: string;
  meta?: string;
  /** The headline reading, e.g. `56`. Sits big above the plot. */
  value?: string;
  unit?: string;
  legend?: { label: string; value: string }[];
  /** Plotted as a dotted polyline. Any range: the drawing normalises it. */
  points?: number[];
  /** A filled bar instead of a plot, for a reading that is a proportion. */
  bar?: number;
  /** Y labels, top to bottom, drawn beside the plot the way the real chart labels its range. */
  axis?: string[];
  /** X labels, left to right, under the plot. */
  span?: string[];
  /** Sets the reading in the card's own size, for a card that is only a number. */
  big?: boolean;
  note?: string;
};

export type Row =
  /** Network. Four lines, the way the tab draws a request when large rows are on. */
  | {
      kind: 'request';
      method: string;
      status: string;
      tone: Tone;
      time: string;
      name: string;
      url: string;
      glyph: 'json' | 'img' | 'ws';
      chips: string[];
      /** Still in flight, so it draws a moving bar where a finished request draws its status. */
      pending?: boolean;
    }
  /** Console. A tag, the message, and the first line of whatever object came with it. */
  | { kind: 'log'; tag?: string; text: string; error?: string; preview?: string; time: string; repeat?: string }
  /** Crashes and Debug. A titled card with chips under it. */
  | { kind: 'card'; title: string; text: string; chips: string[]; time?: string; tone: Tone }
  /** Storage. The type glyph is what tells the stores apart at a glance. */
  | { kind: 'entry'; glyph: string; tone: Tone; name: string; size: string; type: string; preview: string }
  /** Performance interactions. The left bar carries the severity. */
  | { kind: 'metric'; label: string; sub: string; value: string; tone: Tone };

export type Pane = {
  tab: string;
  icon: LucideIcon;
  /** Named the way the real toolbar reads, left to right, after the record and clear pair. */
  tools: LucideIcon[];
  /** The Storage adapter picker, which sits where the other tabs put their first button. */
  picker?: string;
  /** Section pills, as Performance uses to switch between its three views. */
  pills?: string[];
  /** The running count the toolbar keeps on its right. */
  badge?: { text: string; tone: Tone };
  rows: Row[];
  /** Which half leads. Performance leads with Statistics, every other tab leads with its list. */
  primary?: 'rows' | 'blocks';
  /** Docked at the bottom of the list, currently only the Console prompt. */
  prompt?: string;
  /** `active` is which tab the blocks below actually belong to, not always the first one. */
  detail: { tabs: string[]; active?: number; search?: string; blocks: Block[] };
};

export const panes: Pane[] = [
  {
    tab: 'Network',
    icon: Radio,
    tools: [ArrowDown, Filter, Bookmark, Download, Settings],
    rows: [
      {
        kind: 'request',
        method: 'GET',
        status: '',
        tone: 'muted',
        time: 'pending',
        name: 'feed?page=2',
        url: 'https://api.acme.dev/v1/feed?page=2',
        glyph: 'json',
        chips: ['Fetch/XHR', 'fetch'],
        pending: true,
      },
      {
        kind: 'request',
        method: 'GET',
        status: '200',
        tone: 'ok',
        time: '0.23 s · 7:13:09 PM',
        name: 'session',
        url: 'https://api.acme.dev/v1/auth/session',
        glyph: 'json',
        chips: ['Fetch/XHR', 'fetch', '426 B'],
      },
      {
        kind: 'request',
        method: 'GET',
        status: '200',
        tone: 'ok',
        time: '0.26 s · 7:13:06 PM',
        name: 'avatar-6aa14cb34f8e.svg',
        url: 'https://cdn.acme.dev/files/6842b36ba01eccee19a4…',
        glyph: 'img',
        chips: ['Img', 'fetch', '1.1 KB'],
      },
      {
        kind: 'request',
        method: 'GET',
        status: '401',
        tone: 'bad',
        time: '0.19 s · 7:13:04 PM',
        name: 'me',
        url: 'https://api.acme.dev/v1/me',
        glyph: 'json',
        chips: ['Fetch/XHR', 'xhr', '88 B'],
      },
      {
        kind: 'request',
        method: 'POST',
        status: '201',
        tone: 'ok',
        time: '0.41 s · 7:13:01 PM',
        name: 'orders',
        url: 'https://api.acme.dev/v1/orders',
        glyph: 'json',
        chips: ['Fetch/XHR', 'xhr', '2.3 KB'],
      },
      {
        kind: 'request',
        method: 'WS',
        status: '101',
        tone: 'info',
        time: '7:12:58 PM',
        name: 'live',
        url: 'wss://api.acme.dev/live',
        glyph: 'ws',
        chips: ['WebSocket', 'ws', '12 frames'],
      },
    ],
    detail: {
      tabs: ['Headers', 'Preview', 'Response', 'Timing'],
      active: 1,
      search: 'Search this body',
      blocks: [
        {
          kind: 'json',
          lines: [
            { indent: 0, caret: 'open', value: '{error: true, status: 401, …}' },
            { indent: 1, key: 'code', value: '"TOKEN_EXPIRED"', kind: 'string' },
            { indent: 1, key: 'error', value: 'true', kind: 'bool' },
            { indent: 1, key: 'message', value: '"Access token has expired"', kind: 'string' },
            { indent: 1, key: 'retryAfter', value: '30', kind: 'number' },
            { indent: 1, caret: 'open', key: 'request', value: '{id: "8f2a…", method: "GET"}' },
            { indent: 2, key: 'id', value: '"8f2a4c19b7"', kind: 'string' },
            { indent: 2, key: 'method', value: '"GET"', kind: 'string' },
            { indent: 2, caret: 'closed', key: 'headers', value: '{authorization: "Bearer …", …}' },
            { indent: 1, key: 'status', value: '401', kind: 'number' },
            { indent: 1, key: 'traceId', value: 'null', kind: 'null' },
          ],
        },
      ],
    },
  },

  {
    tab: 'Console',
    icon: Terminal,
    tools: [Filter],
    badge: { text: '2', tone: 'warn' },
    rows: [
      {
        kind: 'log',
        tag: '[Cart:service]',
        text: 'config loaded',
        preview: '{branchId: "69f1d0caec05e9", currency: "GBP", …}',
        time: '7:12:43 PM',
      },
      {
        kind: 'log',
        tag: '[Checkout]',
        text: 'session restored',
        preview: '{userId: 8812, retry: false}',
        time: '7:12:44 PM',
      },
      {
        kind: 'log',
        text: 'SYNC::: Error syncing queue job. false',
        error: 'Error: No queue jobs to process.',
        time: '7:12:49 PM',
        repeat: 'x13',
      },
      {
        kind: 'log',
        tag: '[Cart:task]',
        text: 'event received',
        preview: '{eventType: "EXIT", cartId: "8f2a4c19b7"}',
        time: '7:13:05 PM',
      },
    ],
    prompt: 'Run an expression',
    detail: {
      tabs: ['Message', 'Arguments', 'Source'],
      active: 1,
      blocks: [
        { kind: 'banner', label: 'UNCAUGHT ERROR', title: 'TypeError' },
        {
          kind: 'rows',
          rows: [
            ['Origin', 'CartScreen.tsx:42:11'],
            ['Level', 'error'],
            ['Repeated', '13 times'],
          ],
        },
        {
          kind: 'json',
          lines: [
            { indent: 0, caret: 'open', value: '{queue: "sync", pending: 0, …}' },
            { indent: 1, key: 'queue', value: '"sync"', kind: 'string' },
            { indent: 1, key: 'pending', value: '0', kind: 'number' },
            { indent: 1, key: 'lastRunAt', value: '"2026-09-11T19:12:49.108Z"', kind: 'string' },
            { indent: 1, key: 'error', value: 'null', kind: 'null' },
          ],
        },
      ],
    },
  },

  {
    tab: 'Perf',
    icon: Gauge,
    tools: [],
    pills: ['Statistics', 'User timing', 'Interactions 51', 'Long tasks 4'],
    primary: 'blocks',
    rows: [
      { kind: 'metric', label: 'touchend', sub: 'handler 1.1 ms', value: '0.1 s', tone: 'warn' },
      { kind: 'metric', label: 'touchend', sub: 'handler 0.426 ms', value: '3.13 s', tone: 'bad' },
      { kind: 'metric', label: 'touchstart', sub: 'handler 0.468 ms', value: '0.89 s', tone: 'bad' },
      { kind: 'metric', label: 'touchend', sub: 'handler 2.3 ms', value: '0.11 s', tone: 'warn' },
      { kind: 'metric', label: 'touchend', sub: 'handler 9 ms', value: '0.25 s', tone: 'bad' },
      { kind: 'metric', label: 'touchend', sub: 'handler 1.4 ms', value: '0.12 s', tone: 'warn' },
      { kind: 'metric', label: 'touchstart', sub: 'handler 3.4 ms', value: '0.27 s', tone: 'bad' },
      { kind: 'metric', label: 'touchend', sub: 'handler 7.7 ms', value: '0.38 s', tone: 'bad' },
    ],
    detail: {
      tabs: ['Interactions', 'Long tasks'],
      blocks: [
        {
          kind: 'charts',
          charts: [
            {
              title: 'Frames per second',
              meta: 'last 5 min',
              legend: [
                { label: 'JS thread', value: '56' },
                { label: 'Main thread', value: '60' },
              ],
              points: [54, 57, 52, 58, 49, 56, 55, 58, 53, 57, 44, 58, 56, 59, 51, 57, 55, 58, 31, 56, 58],
              axis: ['65', '33', '0'],
              span: ['5m ago', '2.5m', 'now'],
            },
            { title: 'Interactions', value: '3.13', unit: 's', big: true, note: 'worst · 0.3 s average of 51' },
            {
              title: 'JS heap',
              value: '190.3',
              unit: 'MB',
              points: [120, 118, 92, 90, 91, 128, 130, 129, 131, 96, 98, 112, 118, 124, 130, 136, 140, 118, 122, 148, 152],
              axis: ['209.3 MB', '104.7 MB', '0 B'],
              span: ['2m ago', '1m', 'now'],
              note: 'of 236.0 MB allocated',
            },
            { title: 'Device memory', value: '24.0', unit: 'GB', bar: 100, note: '0 B available to this app' },
          ],
        },
      ],
    },
  },

  {
    tab: 'Storage',
    icon: Database,
    tools: [RefreshCw, Plus, Filter, Download, Upload],
    picker: 'Async Storage 5',
    rows: [
      {
        kind: 'entry',
        glyph: '{}',
        tone: 'ok',
        name: 'auth-user',
        size: '25.2 KB',
        type: 'OBJECT',
        preview: '{"state":{"user":{"createdAt":"2026-09-09T15…',
      },
      {
        kind: 'entry',
        glyph: 'Tt',
        tone: 'bad',
        name: 'auth.token',
        size: '184 B',
        type: 'STRING',
        preview: '"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ…',
      },
      {
        kind: 'entry',
        glyph: '01',
        tone: 'info',
        name: 'onboarding.seen',
        size: '5 B',
        type: 'BOOLEAN',
        preview: 'false',
      },
      {
        kind: 'entry',
        glyph: '{}',
        tone: 'ok',
        name: 'feature.flags',
        size: '11.0 KB',
        type: 'OBJECT',
        preview: '{"newCheckout":true,"betaSearch":false,…',
      },
      {
        kind: 'entry',
        glyph: 'Tt',
        tone: 'bad',
        name: 'cart.items',
        size: '20.5 KB',
        type: 'STRING',
        preview: '"[{\\"id\\":\\"6a0c0d0943f19e4adbe31ac7\\",\\"qty…',
      },
    ],
    detail: {
      tabs: ['Value', 'Raw', 'Edit', 'Info'],
      active: 3,
      blocks: [
        {
          kind: 'rows',
          rows: [
            ['Key', 'auth-user'],
            ['Store', 'Async Storage (Async)'],
            ['Shown as', 'Object'],
            ['Stored as', 'string'],
            ['Size', '25.2 KB (25784 characters)'],
            ['Read', '7:15:15 PM'],
            ['Editable', 'yes'],
            ['Deletable', 'yes'],
          ],
        },
      ],
    },
  },

  {
    tab: 'Crashes',
    icon: TriangleAlert,
    tools: [CheckCheck, Filter],
    badge: { text: '2', tone: 'bad' },
    rows: [
      {
        kind: 'card',
        title: 'Error',
        text: 'Deliberate crash from @axonpack/expo-devtools (JS thread)',
        chips: ['Fatal JS error', '700'],
        time: '19:15:55',
        tone: 'bad',
      },
      {
        kind: 'card',
        title: 'TypeError',
        text: "Cannot read property 'id' of null",
        chips: ['Render error', '412'],
        time: '19:12:04',
        tone: 'bad',
      },
      {
        kind: 'card',
        title: 'Unhandled rejection',
        text: 'Token refresh failed, 401',
        chips: ['Promise', '208'],
        time: '19:08:31',
        tone: 'warn',
      },
    ],
    detail: {
      tabs: ['Summary', 'Breadcrumbs'],
      blocks: [
        { kind: 'banner', label: 'FATAL JS ERROR', title: 'Error' },
        {
          kind: 'rows',
          rows: [
            ['Captured', '2026-09-11 19:15:50'],
            ['Thread', 'JS'],
          ],
        },
        {
          kind: 'stack',
          frames: [
            ['crashJsThread', 'index.ts.bundle:393969:20'],
            ['crash', 'index.ts.bundle:393781:156'],
            ['_performTransitionSideEffects', 'index.ts.bundle:60458:20'],
            ['_receiveSignal', 'index.ts.bundle:60413:43'],
            ['onResponderRelease', 'index.ts.bundle:60266:30'],
            ['executeDispatch', 'index.ts.bundle:19912:17'],
            ['run', 'native'],
          ],
        },
      ],
    },
  },

];
