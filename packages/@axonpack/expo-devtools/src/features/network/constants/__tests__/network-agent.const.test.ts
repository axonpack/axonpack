import { runQuery, type AgentQuery } from '../../../../agent/utils/run-query.util';
import { networkLogStore } from '../../stores/network-log.store';
import { NETWORK_AGENT } from '../network-agent.const';

const NOW = Date.now();
const ask = (rest: Partial<AgentQuery> = {}) =>
  runQuery([NETWORK_AGENT], { topic: 'network', ...rest }).text;
const ids = (text: string) =>
  text
    .split('\n')
    .filter((line) => !line.startsWith('#'))
    .slice(1)
    .map((line) => line.split('\t')[0]);
const nextCursor = () => ask().split('\n').pop();

beforeEach(() => {
  networkLogStore.clear();
  networkLogStore.setEnabled(true);
  networkLogStore.add({
    id: 'h1',
    method: 'GET',
    url: 'https://api.test/me',
    status: 'error',
    statusCode: 401,
    startedAt: NOW - 4000,
    duration: 120,
    requestHeaders: { authorization: 'Bearer SECRET-1', accept: 'json' },
    responseHeaders: { 'set-cookie': 'sid=SECRET-2' },
    responseBody: '{"error":"expired"}',
  });
  networkLogStore.addWebSocket({
    id: 'w1',
    method: 'WS',
    socketId: 1,
    url: 'wss://api.test/live',
    status: 'open',
    startedAt: NOW - 3000,
  });
  networkLogStore.addWebSocketMessage('w1', {
    id: 'm1',
    direction: 'received',
    data: 'hello frame',
    messageType: 'text',
    timestamp: NOW,
  });
  networkLogStore.add({
    id: 's1',
    method: 'GET',
    url: 'https://api.test/events',
    status: 'success',
    statusCode: 200,
    eventStream: true,
    startedAt: NOW - 2000,
  });
  networkLogStore.addStreamEvent('s1', { id: 'e1', type: 'message', data: 'tick', timestamp: NOW });
  networkLogStore.add({
    id: 'h2',
    method: 'POST',
    url: 'https://api.test/upload',
    status: 'pending',
    startedAt: NOW - 1000,
  });
});

describe('the network topic', () => {
  it('lists HTTP, sockets and streams newest first, in the default columns', () => {
    expect(ask()).toBe(
      [
        '# network · 4 of 4 match',
        'id\tmethod\tcode\tms\turl',
        'h2\tPOST\t-\t-\thttps://api.test/upload',
        's1\tGET\t200\t-\thttps://api.test/events',
        'w1\tWS\t-\t-\twss://api.test/live',
        'h1\tGET\t401\t120\thttps://api.test/me',
        '# next: --after s1',
      ].join('\n')
    );
  });

  it('filters on kind and code, and counts frames and events', () => {
    expect(ids(ask({ where: ['kind=ws,sse'], fields: 'id,kind,msgs' }))).toEqual(['s1', 'w1']);
    expect(ask({ where: ['kind=ws,sse'], fields: 'id,msgs', json: true })).toBe(
      ['{"id":"s1","msgs":1}', '{"id":"w1","msgs":1}'].join('\n')
    );
    expect(ids(ask({ where: ['code>=400'] }))).toEqual(['h1']);
  });

  it('gets a socket with its frames and a stream with its events', () => {
    expect(JSON.parse(ask({ get: 'w1', json: true })).messages[0].data).toBe('hello frame');
    expect(JSON.parse(ask({ get: 's1', json: true })).events[0].data).toBe('tick');
    expect(ids(ask({ grep: 'hello frame' }))).toEqual(['w1']);
  });

  it('gets the initiator as short locations, with vendor frames only when full', () => {
    const bundle = 'http://localhost:8081/example/index.bundle//&platform=ios&dev=true';
    networkLogStore.add({
      id: 'h3',
      method: 'POST',
      url: 'https://api.test/login',
      status: 'error',
      startedAt: NOW,
      initiator: [
        { fn: 'fetchJson', location: `${bundle}:120:8`, vendor: true },
        { fn: 'login', location: `${bundle}:4410:12`, vendor: false },
      ],
    });
    const login = { fn: 'login', location: 'index.bundle:4410:12', vendor: false };
    expect(JSON.parse(ask({ get: 'h3', json: true })).initiator).toEqual([login]);
    expect(JSON.parse(ask({ get: 'h3', json: true, full: true })).initiator).toEqual([
      { fn: 'fetchJson', location: 'index.bundle:120:8', vendor: true },
      login,
    ]);
  });

  it('masks authorization and cookies in get, lists and filters', () => {
    const row = JSON.parse(ask({ get: 'h1', json: true, full: true }));
    expect(row.requestHeaders).toEqual({ authorization: '[redacted]', accept: 'json' });
    expect(row.responseHeaders).toEqual({ 'set-cookie': '[redacted]' });
    expect(ask({ grep: 'SECRET', count: true })).toBe('0');
    expect(ask({ fields: 'id,response', full: true })).not.toContain('SECRET');
  });

  describe('pending', () => {
    it('holds next before an HTTP request in flight', () => {
      expect(nextCursor()).toBe('# next: --after s1');
    });

    it('lets it pass an open socket and a live stream once the request ends', () => {
      networkLogStore.update('h2', { status: 'success', statusCode: 201, duration: 30 });
      expect(nextCursor()).toBe('# next: --after h2');
    });

    it('holds it before a socket that is still connecting', () => {
      networkLogStore.update('h2', { status: 'success', statusCode: 201, duration: 30 });
      networkLogStore.updateWebSocket('w1', { status: 'connecting' });
      expect(nextCursor()).toBe('# next: --after h1');
    });
  });

  it('says so when the store is off', () => {
    networkLogStore.setEnabled(false);
    expect(ask()).toBe('# network is off: the app turned it off in its devtools config');
  });
});
