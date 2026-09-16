import './panel.css';

import { renderDetail, type TabKey } from './detail.view';
import { add, clear, el } from './dom.util';
import { bytes, clockTime, duration, fileName, host, resourceType } from './format.util';
import { ENTRIES, SOCKET_MESSAGES, type Entry } from './fixtures';
import { renderSandbox } from './sandbox.view';

/**
 * The Network tab, laid out the way a browser's is and carrying what the on-device tab carries.
 *
 * Reads static fixtures rather than the device. Everything below the fixtures is the real view, so
 * pointing it at a live feed later means replacing one import.
 */

const TYPES = ['fetch', 'doc', 'css', 'js', 'img', 'font', 'ws', 'eventsource', 'other'];
const TYPE_COLOURS: Record<string, string> = {
  fetch: '#4a9eff',
  doc: '#6ac48a',
  css: '#c45c8a',
  js: '#e0b050',
  img: '#9a7ad9',
  font: '#d98b4a',
  ws: '#4ad9c4',
  eventsource: '#d9a441',
  other: '#8a8a8a',
};

const THROTTLE = ['No throttling', 'Slow 3G', 'Fast 3G', '4G', 'Custom', 'Offline'];
const AGENTS = ['Device default', 'iOS Safari', 'Android Chrome', 'Desktop Chrome', 'Custom'];

type Filters = {
  types: Set<string>;
  methods: Set<string>;
  sources: Set<string>;
  status: string;
  minSize: string;
  maxDuration: string;
  inFlight: boolean;
  overridden: boolean;
  hideData: boolean;
  hideFailed: boolean;
};

const state = {
  tab: 'network' as 'network' | 'sandbox',
  recording: true,
  preserveLog: false,
  dense: false,
  grouped: false,
  filtersOpen: false,
  settingsOpen: false,
  search: '',
  matchCase: false,
  wholeWord: false,
  regex: false,
  invert: false,
  sortKey: 'startedAt' as 'startedAt' | 'size' | 'duration' | 'status',
  sortDesc: false,
  selected: null as string | null,
  detailTab: 'headers' as TabKey,
  throttle: 'No throttling',
  agent: 'Device default',
  filters: {
    types: new Set<string>(),
    methods: new Set<string>(),
    sources: new Set<string>(),
    status: '',
    minSize: '',
    maxDuration: '',
    inFlight: false,
    overridden: false,
    hideData: false,
    hideFailed: false,
  } as Filters,
};

/** The detail panel's own tab, kept apart from the page's Network/Sandbox one. */
const detailTabState = { tab: state.detailTab };

const app = add(document.body, el('div'));
app.style.cssText = 'flex:1;display:flex;flex-direction:column;min-height:0';

function matches(entry: Entry): boolean {
  const f = state.filters;
  if (f.types.size && !f.types.has(resourceType(entry))) return false;
  if (f.methods.size && !f.methods.has(entry.method)) return false;
  if (f.sources.size && !f.sources.has(entry.source ?? 'native')) return false;
  if (f.hideData && entry.url.startsWith('data:')) return false;
  if (f.hideFailed && entry.kind === 'http' && entry.status === 'error') return false;
  if (f.inFlight && !(entry.kind === 'http' && entry.status === 'pending')) return false;
  if (f.overridden && !(entry.kind === 'http' && entry.intercepted)) return false;

  if (f.status && entry.kind === 'http') {
    const code = entry.statusCode ?? 0;
    const query = f.status.trim();
    const comparison = /^([<>]=?)\s*(\d+)$/.exec(query);
    const range = /^(\d+)\s*-\s*(\d+)$/.exec(query);
    if (comparison) {
      const bound = Number(comparison[2]);
      const ok =
        comparison[1] === '>'
          ? code > bound
          : comparison[1] === '>='
            ? code >= bound
            : comparison[1] === '<'
              ? code < bound
              : code <= bound;
      if (!ok) return false;
    } else if (range) {
      if (code < Number(range[1]) || code > Number(range[2])) return false;
    } else if (/^\d+$/.test(query) && code !== Number(query)) return false;
  }

  if (f.minSize && entry.kind === 'http' && (entry.size ?? 0) < Number(f.minSize) * 1024)
    return false;
  if (f.maxDuration && (entry.duration ?? 0) > Number(f.maxDuration)) return false;

  if (state.search) {
    const haystack = state.matchCase ? entry.url : entry.url.toLowerCase();
    const needle = state.matchCase ? state.search : state.search.toLowerCase();
    let hit: boolean;
    if (state.regex) {
      try {
        hit = new RegExp(state.search, state.matchCase ? '' : 'i').test(entry.url);
      } catch {
        hit = false;
      }
    } else if (state.wholeWord) {
      hit = haystack.split(/[^A-Za-z0-9]+/).includes(needle);
    } else {
      hit = haystack.includes(needle);
    }
    if (hit === state.invert) return false;
  }
  return true;
}

function sorted(entries: Entry[]): Entry[] {
  const rank = (entry: Entry) => {
    if (state.sortKey === 'size') return entry.kind === 'http' ? (entry.size ?? 0) : 0;
    if (state.sortKey === 'duration') return entry.duration ?? 0;
    if (state.sortKey === 'status') return entry.kind === 'http' ? (entry.statusCode ?? 0) : 0;
    return entry.startedAt;
  };
  const out = [...entries].sort((a, b) => rank(a) - rank(b));
  return state.sortDesc ? out.reverse() : out;
}

function highlighted(text: string): HTMLElement {
  const span = el('span');
  if (!state.search || state.regex || state.invert) {
    span.textContent = text;
    return span;
  }
  const needle = state.matchCase ? state.search : state.search.toLowerCase();
  const haystack = state.matchCase ? text : text.toLowerCase();
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1 || !needle) break;
    span.appendChild(document.createTextNode(text.slice(from, at)));
    add(span, el('mark', undefined, text.slice(at, at + needle.length)));
    from = at + needle.length;
  }
  span.appendChild(document.createTextNode(text.slice(from)));
  return span;
}

function toolbar(): HTMLElement {
  const bar = el('div', 'toolbar');

  const record = add(
    bar,
    el('button', `tool record${state.recording ? ' on' : ''}`, state.recording ? '⏺' : '⏵')
  );
  record.title = state.recording ? 'Stop recording' : 'Record';
  record.addEventListener('click', () => {
    state.recording = !state.recording;
    render();
  });

  const clearLog = add(bar, el('button', 'tool', '⊘'));
  clearLog.title = 'Clear';

  add(bar, el('div', 'sep'));

  const search = add(bar, el('div', 'search'));
  add(search, el('span', 'muted', '⌕'));
  const input = add(search, el('input')) as HTMLInputElement;
  input.placeholder = 'Filter';
  input.value = state.search;
  input.addEventListener('input', () => {
    state.search = input.value;
    render();
    (document.querySelector('.search input') as HTMLInputElement)?.focus();
  });
  for (const [key, label, title] of [
    ['matchCase', 'Aa', 'Match case'],
    ['wholeWord', 'ab', 'Whole word'],
    ['regex', '.*', 'Regular expression'],
    ['invert', '!', 'Invert'],
  ] as const) {
    const mode = add(search, el('button', `mode${state[key] ? ' on' : ''}`, label));
    mode.title = title;
    mode.addEventListener('click', () => {
      (state as Record<string, unknown>)[key] = !state[key];
      render();
    });
  }

  const filter = add(bar, el('button', `tool${state.filtersOpen ? ' on' : ''}`, 'Filter'));
  filter.addEventListener('click', () => {
    state.filtersOpen = !state.filtersOpen;
    render();
  });

  add(bar, el('div', 'sep'));

  const checks = add(bar, el('div', 'checks'));
  for (const [key, label] of [
    ['preserveLog', 'Preserve log'],
    ['grouped', 'Group by source'],
    ['dense', 'Dense rows'],
  ] as const) {
    const wrap = add(checks, el('label'));
    const box = add(wrap, el('input')) as HTMLInputElement;
    box.type = 'checkbox';
    box.checked = state[key];
    box.addEventListener('change', () => {
      (state as Record<string, unknown>)[key] = box.checked;
      render();
    });
    add(wrap, el('span', undefined, label));
  }

  add(bar, el('div', 'spacer'));

  const exportLog = add(bar, el('button', 'tool', 'Export'));
  exportLog.title = 'Export every entry, with its messages or events';

  const settings = add(bar, el('button', `tool${state.settingsOpen ? ' on' : ''}`, '⚙'));
  settings.title = 'Settings';
  settings.addEventListener('click', () => {
    state.settingsOpen = !state.settingsOpen;
    render();
  });

  return bar;
}

function chipRow(label: string, values: string[], selected: Set<string>): HTMLElement {
  const group = el('div', 'filter-group');
  add(group, el('span', undefined, label));
  const chips = add(group, el('div', 'chips'));
  for (const value of values) {
    const chip = add(chips, el('button', selected.has(value) ? 'chip on' : 'chip', value));
    chip.addEventListener('click', () => {
      if (selected.has(value)) selected.delete(value);
      else selected.add(value);
      render();
    });
  }
  return group;
}

function textFilter(
  label: string,
  key: 'status' | 'minSize' | 'maxDuration',
  placeholder: string
): HTMLElement {
  const group = el('div', 'filter-group');
  add(group, el('span', undefined, label));
  const input = add(group, el('input')) as HTMLInputElement;
  input.type = 'text';
  input.placeholder = placeholder;
  input.value = state.filters[key];
  input.addEventListener('input', () => {
    state.filters[key] = input.value;
    render();
  });
  return group;
}

function filterPanel(): HTMLElement {
  const panel = el('div', `filters${state.filtersOpen ? ' open' : ''}`);
  if (!state.filtersOpen) return panel;

  add(panel, chipRow('Type', TYPES, state.filters.types));
  add(
    panel,
    chipRow('Method', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'WS'], state.filters.methods)
  );
  add(panel, chipRow('Source', ['native', 'checkout'], state.filters.sources));
  add(panel, textFilter('Status', 'status', '404, 400-499, >=500'));
  add(panel, textFilter('Larger than (kB)', 'minSize', '10'));
  add(panel, textFilter('Slower than (ms)', 'maxDuration', '500'));

  const toggles = add(panel, el('div', 'filter-group'));
  add(toggles, el('span', undefined, 'Only'));
  const checks = add(toggles, el('div', 'checks'));
  for (const [key, label] of [
    ['inFlight', 'In flight'],
    ['overridden', 'Answered by a rule'],
    ['hideData', 'Hide data URLs'],
    ['hideFailed', 'Hide failed'],
  ] as const) {
    const wrap = add(checks, el('label'));
    const box = add(wrap, el('input')) as HTMLInputElement;
    box.type = 'checkbox';
    box.checked = state.filters[key];
    box.addEventListener('change', () => {
      state.filters[key] = box.checked;
      render();
    });
    add(wrap, el('span', undefined, label));
  }
  return panel;
}

function settingsPanel(): HTMLElement {
  const panel = el('div', 'filters open');
  const conditions = add(panel, el('div', 'filter-group'));
  add(conditions, el('span', undefined, 'Throttling'));
  const chips = add(conditions, el('div', 'chips'));
  for (const preset of THROTTLE) {
    const chip = add(chips, el('button', state.throttle === preset ? 'chip on' : 'chip', preset));
    chip.addEventListener('click', () => {
      state.throttle = preset;
      render();
    });
  }

  const agent = add(panel, el('div', 'filter-group'));
  add(agent, el('span', undefined, 'User agent'));
  const agents = add(agent, el('div', 'chips'));
  for (const preset of AGENTS) {
    const chip = add(agents, el('button', state.agent === preset ? 'chip on' : 'chip', preset));
    chip.addEventListener('click', () => {
      state.agent = preset;
      render();
    });
  }

  const overrides = add(panel, el('div', 'filter-group'));
  add(overrides, el('span', undefined, 'Override the selected request'));
  const row = add(overrides, el('div', 'chips'));
  add(row, el('button', 'chip', 'Block'));
  add(row, el('button', 'chip', 'Respond 200'));
  add(row, el('button', 'chip', 'Respond 500'));
  add(row, el('button', 'chip', 'Edit body…'));
  return panel;
}

function overview(entries: Entry[]): HTMLElement {
  const strip = el('div', 'overview');
  if (entries.length === 0) return strip;

  const first = Math.min(...entries.map((entry) => entry.startedAt));
  const last = Math.max(...entries.map((entry) => entry.startedAt + (entry.duration ?? 0)));
  const span = Math.max(last - first, 1);

  entries.forEach((entry, index) => {
    const bar = add(strip, el('div', 'bar'));
    bar.style.left = `${8 + ((entry.startedAt - first) / span) * 84}%`;
    bar.style.width = `${Math.max(0.6, ((entry.duration ?? 40) / span) * 84)}%`;
    bar.style.top = `${6 + (index % 4) * 7}px`;
    bar.style.background = TYPE_COLOURS[resourceType(entry)] ?? '#8a8a8a';
  });

  const axis = add(strip, el('div', 'axis'));
  add(axis, el('span', undefined, '0 ms'));
  add(axis, el('span', undefined, duration(span)));
  return strip;
}

function statusCell(entry: Entry): HTMLElement {
  if (entry.kind === 'websocket') return el('span', 'status-ok', entry.status);
  if (entry.status === 'pending') return el('span', 'status-pending', 'pending');
  if (entry.statusCode) {
    const failed = entry.statusCode >= 400;
    return el('span', failed ? 'status-err' : 'status-ok', String(entry.statusCode));
  }
  return el('span', 'status-err', entry.canceled ? 'cancelled' : 'failed');
}

function list(entries: Entry[]): HTMLElement {
  const wrap = el('div', 'list');
  const table = add(wrap, el('table', 'rows'));

  const head = add(add(table, el('thead')), el('tr'));
  const columns: { label: string; key?: typeof state.sortKey }[] = [
    { label: 'Name' },
    { label: 'Method' },
    { label: 'Status', key: 'status' },
    { label: 'Type' },
    { label: 'Source' },
    { label: 'Size', key: 'size' },
    { label: 'Time', key: 'duration' },
    { label: 'Started', key: 'startedAt' },
  ];
  for (const column of columns) {
    const arrow = column.key && state.sortKey === column.key ? (state.sortDesc ? ' ↓' : ' ↑') : '';
    const cell = add(head, el('th', undefined, column.label + arrow));
    if (column.key) {
      cell.addEventListener('click', () => {
        if (state.sortKey === column.key) state.sortDesc = !state.sortDesc;
        else {
          state.sortKey = column.key!;
          state.sortDesc = false;
        }
        render();
      });
    }
  }

  const body = add(table, el('tbody'));
  if (entries.length === 0) {
    const row = add(body, el('tr'));
    const cell = add(row, el('td', 'empty', 'No requests match.'));
    cell.colSpan = columns.length;
    return wrap;
  }

  const groups = state.grouped
    ? [...new Set(entries.map((entry) => entry.source ?? 'native'))].map((source) => ({
        source,
        rows: entries.filter((entry) => (entry.source ?? 'native') === source),
      }))
    : [{ source: null as string | null, rows: entries }];

  for (const group of groups) {
    if (group.source) {
      const row = add(body, el('tr', 'group'));
      const cell = add(row, el('td', undefined, group.source));
      cell.colSpan = columns.length;
    }

    for (const entry of group.rows) {
      const row = add(body, el('tr', entry.id === state.selected ? 'selected' : undefined));
      row.addEventListener('click', () => {
        state.selected = state.selected === entry.id ? null : entry.id;
        render();
      });

      const name = add(add(row, el('td')), el('div', 'name'));
      const dot = add(name, el('span', 'type-dot'));
      dot.style.background = TYPE_COLOURS[resourceType(entry)] ?? '#8a8a8a';
      add(name, highlighted(fileName(entry.url)));
      if (entry.kind === 'http' && entry.intercepted)
        add(name, el('span', 'tag', entry.intercepted));
      if (entry.kind === 'http' && entry.eventStream) add(name, el('span', 'tag', 'stream'));
      if (entry.kind === 'websocket') {
        const count = SOCKET_MESSAGES[entry.id]?.length ?? 0;
        add(name, el('span', 'tag', `${count} msg`));
      }

      add(row, el('td', 'muted', entry.method));
      add(add(row, el('td')), statusCell(entry));
      add(row, el('td', 'muted', resourceType(entry)));
      add(row, el('td', 'muted', entry.source ?? 'native'));
      add(row, el('td', 'muted', entry.kind === 'http' ? bytes(entry.size) : '—'));
      add(row, el('td', 'muted', duration(entry.duration)));
      add(row, el('td', 'muted', clockTime(entry.startedAt)));
    }
  }

  const footer = add(wrap, el('div', 'muted'));
  footer.style.padding = '6px 8px';
  const total = entries.reduce(
    (sum, entry) => sum + (entry.kind === 'http' ? (entry.size ?? 0) : 0),
    0
  );
  footer.textContent = `${entries.length} requests · ${bytes(total)} transferred · ${host(entries[0]!.url)}`;
  return wrap;
}

function render(): void {
  document.body.classList.toggle('dense', state.dense);
  clear(app);

  const tabs = add(app, el('div', 'tabs'));
  for (const [key, label] of [
    ['network', 'Network'],
    ['sandbox', 'Sandbox'],
  ] as const) {
    const button = add(tabs, el('button', state.tab === key ? 'active' : undefined, label));
    button.addEventListener('click', () => {
      state.tab = key;
      render();
    });
  }

  if (state.tab === 'sandbox') {
    const box = add(app, el('div', 'sandbox'));
    renderSandbox(box, render);
    return;
  }

  add(app, toolbar());
  add(app, filterPanel());
  if (state.settingsOpen) add(app, settingsPanel());

  const visible = sorted(ENTRIES.filter(matches));
  add(app, overview(visible));

  const split = add(app, el('div', 'split'));
  add(split, list(visible));

  const selected = visible.find((entry) => entry.id === state.selected) ?? null;
  const detail = add(split, el('div', `detail${selected ? '' : ' hidden'}`));
  renderDetail(detail, selected, detailTabState, render, () => {
    state.selected = null;
    render();
  });
}

render();
