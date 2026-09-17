import { add, clear, el } from './dom.util';

/**
 * The Sandbox tab: edit a request and send it for real.
 *
 * Same shape as the on-device one — a URL bar with the method beside it, Request and Response tabs
 * under it, and auth, headers, params and body inside Request.
 */

type Pair = { on: boolean; key: string; value: string };

type SandboxState = {
  tab: 'request' | 'response';
  section: 'params' | 'headers' | 'auth' | 'body';
  method: string;
  url: string;
  params: Pair[];
  headers: Pair[];
  auth: { kind: 'none' | 'bearer' | 'basic'; token: string; user: string; password: string };
  body: string;
  response: {
    status: number;
    statusText: string;
    ms: number;
    body: string;
    headers: Record<string, string>;
  } | null;
};

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export const sandboxState: SandboxState = {
  tab: 'request',
  section: 'params',
  method: 'POST',
  url: 'https://api.example.com/v1/observations',
  params: [{ on: true, key: 'ward', value: '3' }],
  headers: [
    { on: true, key: 'content-type', value: 'application/json' },
    { on: true, key: 'authorization', value: 'Bearer eyJhbGciOi…' },
  ],
  auth: {
    kind: 'bearer',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.redacted',
    user: '',
    password: '',
  },
  body: JSON.stringify({ patientId: 'p-1003', temperature: 37.4, pulse: 74 }, null, 2),
  response: {
    status: 201,
    statusText: 'Created',
    ms: 214,
    headers: { 'content-type': 'application/json', location: '/v1/observations/o-5521' },
    body: JSON.stringify({ id: 'o-5521', recordedAt: '2026-09-16T10:07:02Z' }, null, 2),
  },
};

function pairTable(rows: Pair[], onChange: () => void): HTMLElement {
  const box = el('div');
  rows.forEach((pair, index) => {
    const row = add(box, el('div', 'kvrow'));

    const enabled = add(row, el('input')) as HTMLInputElement;
    enabled.type = 'checkbox';
    enabled.checked = pair.on;
    enabled.addEventListener('change', () => {
      pair.on = enabled.checked;
    });

    const key = add(row, el('input')) as HTMLInputElement;
    key.value = pair.key;
    key.placeholder = 'name';
    key.addEventListener('input', () => {
      pair.key = key.value;
    });

    const value = add(row, el('input')) as HTMLInputElement;
    value.value = pair.value;
    value.placeholder = 'value';
    value.addEventListener('input', () => {
      pair.value = value.value;
    });

    const remove = add(row, el('button', 'tool', '✕'));
    remove.addEventListener('click', () => {
      rows.splice(index, 1);
      onChange();
    });
  });

  const addRow = add(box, el('button', 'table-add', '+ Add'));
  addRow.addEventListener('click', () => {
    rows.push({ on: true, key: '', value: '' });
    onChange();
  });
  return box;
}

function authSection(onChange: () => void): HTMLElement {
  const box = el('div');
  const chips = add(box, el('div', 'chips'));
  for (const kind of ['none', 'bearer', 'basic'] as const) {
    const chip = add(
      chips,
      el('button', sandboxState.auth.kind === kind ? 'chip on' : 'chip', kind)
    );
    chip.addEventListener('click', () => {
      sandboxState.auth.kind = kind;
      onChange();
    });
  }

  if (sandboxState.auth.kind === 'bearer') {
    const field = add(box, el('div', 'kvrow')) as HTMLElement;
    field.style.gridTemplateColumns = '1fr';
    const token = add(field, el('input')) as HTMLInputElement;
    token.value = sandboxState.auth.token;
    token.placeholder = 'token';
    token.addEventListener('input', () => {
      sandboxState.auth.token = token.value;
    });
  }

  if (sandboxState.auth.kind === 'basic') {
    const field = add(box, el('div', 'kvrow')) as HTMLElement;
    field.style.gridTemplateColumns = '1fr 1fr';
    const user = add(field, el('input')) as HTMLInputElement;
    user.placeholder = 'user';
    user.value = sandboxState.auth.user;
    const password = add(field, el('input')) as HTMLInputElement;
    password.placeholder = 'password';
    password.type = 'password';
    password.value = sandboxState.auth.password;
  }
  return box;
}

export function renderSandbox(root: HTMLElement, onChange: () => void): void {
  clear(root);
  const state = sandboxState;

  const bar = add(root, el('div', 'urlbar'));
  const method = add(bar, el('select')) as HTMLSelectElement;
  for (const name of METHODS) {
    const option = add(method, el('option', undefined, name)) as HTMLOptionElement;
    option.value = name;
  }
  method.value = state.method;
  method.addEventListener('change', () => {
    state.method = method.value;
  });

  const url = add(bar, el('input')) as HTMLInputElement;
  url.value = state.url;
  url.placeholder = 'https://';
  url.addEventListener('input', () => {
    state.url = url.value;
  });

  const send = add(bar, el('button', 'send', 'Send'));
  send.addEventListener('click', () => {
    state.tab = 'response';
    onChange();
  });

  const tabs = add(root, el('div', 'tabs'));
  for (const key of ['request', 'response'] as const) {
    const label =
      key === 'response' && state.response
        ? `Response (${state.response.status})`
        : key === 'response'
          ? 'Response'
          : 'Request';
    const button = add(tabs, el('button', state.tab === key ? 'active' : undefined, label));
    button.addEventListener('click', () => {
      state.tab = key;
      onChange();
    });
  }

  const body = add(root, el('div', 'sandbox-body'));

  if (state.tab === 'response') {
    if (!state.response) {
      add(body, el('div', 'muted', 'Nothing sent yet.'));
      return;
    }
    const head = add(body, el('div', 'section'));
    add(head, el('h3', undefined, 'Response'));
    const summary = add(head, el('table', 'kv'));
    for (const [key, value] of [
      ['Status', `${state.response.status} ${state.response.statusText}`],
      ['Time', `${state.response.ms} ms`],
    ] as const) {
      const row = add(summary, el('tr'));
      add(row, el('th', undefined, key));
      add(row, el('td', undefined, value));
    }

    const headers = add(body, el('div', 'section'));
    add(headers, el('h3', undefined, 'Headers'));
    const table = add(headers, el('table', 'kv'));
    for (const [key, value] of Object.entries(state.response.headers)) {
      const row = add(table, el('tr'));
      add(row, el('th', undefined, key));
      add(row, el('td', undefined, value));
    }

    const payload = add(body, el('div', 'section'));
    add(payload, el('h3', undefined, 'Body'));
    add(payload, el('pre', 'body', state.response.body));
    return;
  }

  const sections = add(body, el('div', 'chips'));
  for (const key of ['params', 'headers', 'auth', 'body'] as const) {
    const chip = add(sections, el('button', state.section === key ? 'chip on' : 'chip', key));
    chip.addEventListener('click', () => {
      state.section = key;
      onChange();
    });
  }

  const panel = add(body, el('div', 'section'));
  panel.style.marginTop = '10px';

  if (state.section === 'params') add(panel, pairTable(state.params, onChange));
  if (state.section === 'headers') add(panel, pairTable(state.headers, onChange));
  if (state.section === 'auth') add(panel, authSection(onChange));
  if (state.section === 'body') {
    const area = add(panel, el('textarea')) as HTMLTextAreaElement;
    area.value = state.body;
    area.rows = 14;
    area.style.cssText =
      'width:100%;background:var(--raised);border:1px solid var(--line);border-radius:4px;padding:8px;outline:none;resize:vertical';
    area.addEventListener('input', () => {
      state.body = area.value;
    });
  }
}
