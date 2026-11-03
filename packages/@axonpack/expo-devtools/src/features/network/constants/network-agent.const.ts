import type { AgentActionOptions, AgentTopic } from '../../../agent/constants/agent-topics.const';
import { runQuery } from '../../../agent/utils/run-query.util';
import { formatFrameLocation } from '../../../core/utils/frame-location.util';
import { maskNetworkEntryForAgent } from '../services/redact-network.service';
import {
  networkLogStore,
  type NetworkEntry,
  type ServerSentEvent,
  type WebSocketMessage,
} from '../stores/network-log.store';
import { networkOverridesStore } from '../stores/network-overrides.store';
import { isErrorStatus } from '../utils/formatters.util';
import { buildSandboxRequest, sandboxDraftFor, sendSandboxRequest } from '../utils/sandbox.util';

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
  // The store keeps a 4xx/5xx answer as `success`, and the panels paint it red with
  // `isErrorStatus`. Here it is `error`, so `state=error` lists every request that failed.
  const http =
    row.status !== 'pending' && isErrorStatus(row.status, row.statusCode)
      ? { ...row, status: 'error' as const }
      : row;
  return http.eventStream ? { ...http, events: networkLogStore.getStreamEvents(http.id) } : http;
}

export const NETWORK_AGENT: AgentTopic<NetworkAgentRow> = {
  name: 'network',
  about:
    'HTTP, WebSocket and SSE since launch, newest first. state=error is every failed request; get shows frames and events',
  rows: () => networkLogStore.getMergedSnapshot().map(toAgentRow),
  enabled: networkLogStore.isEnabled,
  fields: {
    id: (e) => e.id,
    t: (e) => e.startedAt,
    kind: (e) => (e.kind === 'websocket' ? 'ws' : e.eventStream ? 'sse' : 'http'),
    method: (e) => e.method,
    // The HTTP status only, so `code>=400` never takes in a socket that closed.
    code: (e) => (e.kind === 'http' ? e.statusCode : undefined),
    close: (e) => (e.kind === 'websocket' ? e.closeCode : undefined),
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
  // `state` too, as the panels show a socket's state where a request's code goes.
  show: ['id', 'method', 'code', 'state', 'ms', 'url'],
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
  actions: {
    override: {
      usage: '<url> [--status <n>] [--body <text> | --body-file <path>] [--content-type <type>]',
      args: [1, 1],
      options: ['status', 'body', 'contentType'],
      run: ([url], { status = '200', body = '', contentType = 'application/json' }) => {
        const code = Number(status);
        // `new Response` throws outside 200 to 599, which would break the app's own request.
        if (!Number.isInteger(code) || code < 200 || code > 599) {
          throw new Error(`bad --status ${status}: use 200 to 599`);
        }
        networkOverridesStore.set({
          url: wholeUrl(url),
          action: 'respond',
          status: code,
          body,
          contentType,
        });
        return `# network · override on ${url}: ${code}, ${contentType}, ${body.length} chars. The app's requests to that exact URL get it, without reaching the network`;
      },
    },
    block: {
      usage: '<url>',
      args: [1, 1],
      run: ([url]) => {
        networkOverridesStore.set({ url: wholeUrl(url), action: 'block' });
        return `# network · blocking ${url}: the app's requests to that exact URL fail as if offline`;
      },
    },
    unoverride: {
      usage: '<url> | --all',
      args: [0, 1],
      options: ['all'],
      run: ([url], { all }) => {
        if (Boolean(all) === (url !== undefined)) {
          throw new Error('usage: devtools network unoverride <url> | --all');
        }
        if (all) {
          const count = networkOverridesStore.getSnapshot().length;
          networkOverridesStore.clear();
          return `# network · removed ${count} override${count === 1 ? '' : 's'}`;
        }
        if (!networkOverridesStore.find(url)) {
          throw new Error(`no override on ${url}. devtools network overrides lists them`);
        }
        networkOverridesStore.remove(url);
        return `# network · removed the override on ${url}`;
      },
    },
    overrides: {
      usage: '',
      args: [0, 0],
      run: () => {
        const overrides = networkOverridesStore.getSnapshot();
        return [
          `# network · ${overrides.length} override${overrides.length === 1 ? '' : 's'}`,
          'url\taction\tstatus\ttype\tsize',
          ...overrides.map((rule) =>
            rule.action === 'block'
              ? `${rule.url}\tblock\t-\t-\t-`
              : `${rule.url}\trespond\t${rule.status ?? 200}\t${rule.contentType ?? '-'}\t${(rule.body ?? '').length}`
          ),
        ].join('\n');
      },
    },
    send: {
      usage:
        "<METHOD> <url> [--header 'Name: value']... [--body <text> | --body-file <path>] [--yes]",
      args: [2, 2],
      options: ['header', 'body', 'yes'],
      run: ([method, url], options) =>
        sendFromApp(
          { method: method.toUpperCase(), url: wholeUrl(url), headers: {}, body: undefined },
          options,
          [`sending ${method.toUpperCase()} ${url}`, `sent ${method.toUpperCase()} ${url}`]
        ),
    },
    replay: {
      usage: "<id> [--header 'Name: value']... [--body <text> | --body-file <path>] [--yes]",
      args: [1, 1],
      options: ['header', 'body', 'yes'],
      run: ([id], options) => {
        const entry = networkLogStore.getSnapshot().find((each) => each.id === id);
        if (!entry) {
          throw new Error(
            networkLogStore.getWebSocketSnapshot().some((each) => each.id === id)
              ? `${id} is a WebSocket. replay sends HTTP requests only`
              : `no network row "${id}", it may have aged out of the buffer`
          );
        }
        // The sandbox's own path from a logged row to a request, so a replay is what the Sandbox
        // button would send.
        return sendFromApp(buildSandboxRequest(sandboxDraftFor(entry)), options, [
          `replaying ${id}`,
          `replayed ${id}`,
        ]);
      },
    },
  },
};

/** Overrides match the exact URL a request uses, so a path or a pattern would never match. */
function wholeUrl(url: string): string {
  if (!/^https?:\/\//i.test(url)) {
    throw new Error(
      `"${url}" is not a whole URL. Use the exact URL the app requests, https:// and query included`
    );
  }
  return url;
}

/** `Name: value` lines on top of the headers, each replacing one of the same name in any case. */
function withHeaders(base: Record<string, string>, lines: readonly string[] = []) {
  const headers = { ...base };
  for (const line of lines) {
    const colon = line.indexOf(':');
    const name = line.slice(0, Math.max(colon, 0)).trim();
    // Not quoted back: the value may be a token.
    if (!name) throw new Error("bad --header: use 'Name: value'");
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === name.toLowerCase()) delete headers[key];
    }
    headers[name] = line.slice(colon + 1).trim();
  }
  return headers;
}

/**
 * Sends through the sandbox's own `sendSandboxRequest`, so the request goes through the app's
 * patched fetch and is a row in the log like any other. The `--yes` check is here, not in the CLI,
 * since the relay route reaches `act` without it.
 */
function sendFromApp(
  request: { method: string; url: string; headers: Record<string, string>; body?: string },
  options: AgentActionOptions,
  [doing, done]: [string, string]
) {
  const { method, url } = request;
  if (!/^[A-Z]+$/.test(method)) throw new Error(`bad method "${method}": use GET, POST, ...`);
  if (method !== 'GET' && options.yes !== true) {
    throw new Error(`${method} can change data on the server, so it needs --yes. GET goes without`);
  }
  if (options.body !== undefined && (method === 'GET' || method === 'HEAD')) {
    throw new Error(`a ${method} request has no body, so drop --body`);
  }
  const headers = withHeaders(request.headers, options.header);
  // The patched fetch logs the request before its first await, so the row is there right after.
  const before = networkLogStore.getSnapshot()[0]?.id;
  const sent = sendSandboxRequest({ method, url, headers, body: options.body ?? request.body });
  const newest = networkLogStore.getSnapshot()[0]?.id;
  const id = newest !== before ? newest : undefined;
  const as = id ? ` as ${id}` : '';
  return {
    waitingFor: `${doing}${as}`,
    answer: sent.then((result) => {
      if (id) {
        // The row as a list shows it, through the same masking as every other reply.
        const fields = [...NETWORK_AGENT.show, 'error'].join(',');
        const reply = runQuery([NETWORK_AGENT], { topic: 'network', where: [`id=${id}`], fields });
        if (reply.matched === 1) {
          const [, header, row] = reply.text.split('\n');
          return `# network · ${done}${as}. devtools get network ${id} shows it whole\n${header}\n${row}`;
        }
      }
      if (!result.ok) throw new Error(`${method} ${url} failed: ${result.error}`);
      return `# network · ${done}: ${result.status} in ${result.duration} ms. Not in the log: recording is paused, or the app's network redact config dropped it`;
    }),
  };
}
