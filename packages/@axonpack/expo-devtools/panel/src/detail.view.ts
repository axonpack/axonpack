import { add, clear, el } from './dom.util';
import { bytes, clockTime, duration } from './format.util';
import {
  SOCKET_MESSAGES,
  STREAM_EVENTS,
  type Entry,
  type HttpEntry,
  type SocketEntry,
} from './fixtures';

/**
 * The detail panel, tab for tab with the on-device one: Headers, Payload, Preview, Response, Events,
 * Timing, Cookies, Initiator. Events only appears for a socket or a stream, which is the same rule
 * the device applies.
 */

type TabKey =
  'headers' | 'payload' | 'preview' | 'response' | 'events' | 'timing' | 'cookies' | 'initiator';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'headers', label: 'Headers' },
  { key: 'payload', label: 'Payload' },
  { key: 'preview', label: 'Preview' },
  { key: 'response', label: 'Response' },
  { key: 'events', label: 'Events' },
  { key: 'timing', label: 'Timing' },
  { key: 'cookies', label: 'Cookies' },
  { key: 'initiator', label: 'Initiator' },
];

/** The phases the platform reports, in the order they happen. */
const PHASES: { key: keyof NonNullable<HttpEntry['phases']>; label: string; colour: string }[] = [
  { key: 'queuedMs', label: 'Queued', colour: '#8a8a8a' },
  { key: 'dnsMs', label: 'DNS', colour: '#9a7ad9' },
  { key: 'tcpMs', label: 'TCP', colour: '#d98b4a' },
  { key: 'tlsMs', label: 'TLS', colour: '#c45c8a' },
  { key: 'sendMs', label: 'Send', colour: '#4a9eff' },
  { key: 'waitMs', label: 'Waiting (TTFB)', colour: '#e0b050' },
  { key: 'downloadMs', label: 'Download', colour: '#6ac48a' },
];

function section(title: string): HTMLElement {
  const box = el('div', 'section');
  add(box, el('h3', undefined, title));
  return box;
}

function keyValues(pairs: Record<string, string> | undefined, emptyText: string): HTMLElement {
  if (!pairs || Object.keys(pairs).length === 0) return el('div', 'muted', emptyText);
  const table = el('table', 'kv');
  for (const [key, value] of Object.entries(pairs)) {
    const row = add(table, el('tr'));
    add(row, el('th', undefined, key));
    add(row, el('td', undefined, value));
  }
  return table;
}

function hasEvents(entry: Entry): boolean {
  return entry.kind === 'websocket' || Boolean(entry.eventStream);
}

function headersTab(entry: Entry): HTMLElement {
  const box = el('div');

  const general = add(box, section('General'));
  const pairs: Record<string, string> = {
    'Request URL': entry.url,
    'Request Method': entry.method,
  };
  if (entry.kind === 'http') {
    pairs['Status Code'] = entry.statusCode
      ? `${entry.statusCode} ${entry.statusText ?? ''}`.trim()
      : entry.error
        ? 'failed'
        : 'pending';
    if (entry.phases?.protocol) pairs.Protocol = entry.phases.protocol;
    if (entry.intercepted) pairs.Intercepted = entry.intercepted;
    if (entry.conditions) pairs['Network conditions'] = entry.conditions.label;
  } else {
    pairs.Status = entry.status;
    if (entry.protocols?.length) pairs.Subprotocols = entry.protocols.join(', ');
  }
  if (entry.source) pairs.Source = entry.source;
  add(general, keyValues(pairs, ''));

  if (entry.kind === 'http') {
    const response = add(box, section('Response headers'));
    add(response, keyValues(entry.responseHeaders, 'No response headers.'));
    const request = add(box, section('Request headers'));
    add(request, keyValues(entry.requestHeaders, 'No request headers.'));
  }
  return box;
}

function payloadTab(entry: Entry): HTMLElement {
  const box = el('div');
  if (entry.kind !== 'http' || !entry.requestBody) {
    add(box, el('div', 'muted', 'This request had no body.'));
    return box;
  }
  const body = add(box, section('Request payload'));
  add(body, el('pre', 'body', entry.requestBody));
  return box;
}

function previewTab(entry: Entry): HTMLElement {
  const box = el('div');
  if (entry.kind !== 'http') {
    add(box, el('div', 'muted', 'A socket has no response to preview.'));
    return box;
  }
  if (entry.mimeType?.startsWith('image/')) {
    const note = add(box, section('Image'));
    add(
      note,
      el(
        'div',
        'muted',
        `${entry.mimeType}, ${bytes(entry.size)}. Rendered from the bytes that came back.`
      )
    );
    return box;
  }
  if (!entry.responseBody) {
    add(box, el('div', 'muted', 'Nothing to preview.'));
    return box;
  }
  const pretty = add(box, section('Preview'));
  try {
    add(pretty, el('pre', 'body', JSON.stringify(JSON.parse(entry.responseBody), null, 2)));
  } catch {
    add(pretty, el('pre', 'body', entry.responseBody));
  }
  return box;
}

function responseTab(entry: Entry): HTMLElement {
  const box = el('div');
  if (entry.kind !== 'http' || !entry.responseBody) {
    add(box, el('div', 'muted', 'No response body was kept.'));
    return box;
  }
  const raw = add(box, section(`Response body — ${bytes(entry.size)}`));
  add(raw, el('pre', 'body', entry.responseBody));
  return box;
}

function eventsTab(entry: Entry): HTMLElement {
  const box = el('div');

  if (entry.kind === 'websocket') {
    const messages = SOCKET_MESSAGES[entry.id] ?? [];
    const head = add(box, section(`Messages (${messages.length})`));
    const table = add(head, el('table', 'kv'));
    for (const message of messages) {
      const row = add(table, el('tr'));
      add(
        row,
        el(
          'th',
          undefined,
          `${message.direction === 'sent' ? '↑' : '↓'} ${clockTime(message.timestamp)}`
        )
      );
      const cell = add(row, el('td'));
      add(cell, el('span', message.messageType === 'binary' ? 'muted' : undefined, message.data));
    }
    return box;
  }

  const events = STREAM_EVENTS[entry.id] ?? [];
  const head = add(box, section(`Events (${events.length})`));
  const table = add(head, el('table', 'kv'));
  for (const event of events) {
    const row = add(table, el('tr'));
    add(row, el('th', undefined, `${clockTime(event.timestamp)}  ${event.type}`));
    const cell = add(row, el('td'));
    add(cell, el('div', undefined, event.data));
    if (event.lastEventId) add(cell, el('div', 'muted', `id: ${event.lastEventId}`));
  }
  return box;
}

function timingTab(entry: Entry): HTMLElement {
  const box = el('div');
  if (entry.kind !== 'http' || !entry.phases) {
    add(box, el('div', 'muted', 'The platform reported no phases for this one.'));
    return box;
  }

  const phases = entry.phases;
  const measured = PHASES.filter((phase) => typeof phases[phase.key] === 'number');
  const longest = Math.max(...measured.map((phase) => phases[phase.key] as number), 1);

  const chart = add(box, section(`Timing — measured by ${phases.measuredBy}`));
  const rows = add(chart, el('div', 'waterfall'));
  for (const phase of measured) {
    const value = phases[phase.key] as number;
    const row = add(rows, el('div', 'phase'));
    add(row, el('span', 'muted', phase.label));
    const track = add(row, el('div', 'track'));
    const fill = add(track, el('div', 'fill'));
    fill.style.width = `${Math.max(1, (value / longest) * 100)}%`;
    fill.style.background = phase.colour;
    add(row, el('span', 'value', duration(value)));
  }

  const totals = add(box, section('Totals'));
  const summary: Record<string, string> = { Total: duration(phases.totalMs ?? entry.duration) };
  if (entry.ttfb !== undefined) summary['Waiting (TTFB)'] = duration(entry.ttfb);
  if (phases.reusedConnection) summary.Connection = 'reused, so no DNS, TCP or TLS phase';
  if (entry.transfer) {
    summary.Wire = bytes(entry.transfer.wireBytes);
    summary.Decoded = bytes(entry.transfer.decodedBytes);
  }
  add(totals, keyValues(summary, ''));
  return box;
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const [name, ...rest] = part.split('=');
    if (name?.trim()) out[name.trim()] = rest.join('=').trim();
  }
  return out;
}

function cookiesTab(entry: Entry): HTMLElement {
  const box = el('div');
  if (entry.kind !== 'http') {
    add(box, el('div', 'muted', 'A socket sends no cookies of its own.'));
    return box;
  }

  const sent = add(box, section('Request cookies'));
  add(sent, keyValues(parseCookies(entry.requestHeaders?.cookie), 'This request sent none.'));

  const set = add(box, section('Response cookies'));
  add(
    set,
    keyValues(parseCookies(entry.responseHeaders?.['set-cookie']), 'This response set none.')
  );

  if (entry.pageCookies !== undefined) {
    const page = add(box, section('Cookies the page could see'));
    add(page, keyValues(parseCookies(entry.pageCookies), 'None.'));
    add(
      page,
      el(
        'div',
        'muted',
        'What document.cookie held, not what the request sent: the engine writes that header itself and an HttpOnly cookie is invisible to a page.'
      )
    );
  }
  return box;
}

function initiatorTab(entry: Entry): HTMLElement {
  const box = el('div');
  if (entry.kind !== 'http' || !entry.initiator?.length) {
    add(box, el('div', 'muted', 'No call stack was captured for this one.'));
    return box;
  }
  const stack = add(box, section('Initiator'));
  const table = add(stack, el('table', 'kv'));
  for (const frame of entry.initiator) {
    const row = add(table, el('tr'));
    add(row, el('th', undefined, frame.method ?? '(anonymous)'));
    add(row, el('td', undefined, `${frame.file}:${frame.line}:${frame.column}`));
  }
  return box;
}

const RENDERERS: Record<TabKey, (entry: Entry) => HTMLElement> = {
  headers: headersTab,
  payload: payloadTab,
  preview: previewTab,
  response: responseTab,
  events: eventsTab,
  timing: timingTab,
  cookies: cookiesTab,
  initiator: initiatorTab,
};

export function renderDetail(
  root: HTMLElement,
  entry: Entry | SocketEntry | null,
  state: { tab: TabKey },
  onChange: () => void,
  onClose: () => void
): void {
  clear(root);
  if (!entry) return;

  const head = add(root, el('div', 'detail-head'));
  add(head, el('span', 'url', entry.url));
  const close = add(head, el('button', 'tool', '✕'));
  close.title = 'Close';
  close.addEventListener('click', onClose);

  const tabs = add(root, el('div', 'tabs'));
  const visible = TABS.filter((tab) => tab.key !== 'events' || hasEvents(entry));
  if (!visible.some((tab) => tab.key === state.tab)) state.tab = 'headers';

  for (const tab of visible) {
    const button = add(tabs, el('button', tab.key === state.tab ? 'active' : undefined, tab.label));
    button.addEventListener('click', () => {
      state.tab = tab.key;
      onChange();
    });
  }

  const body = add(root, el('div', 'detail-body'));
  add(body, RENDERERS[state.tab](entry));
}

export type { TabKey };
