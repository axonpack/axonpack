import {
  buildNetworkExport,
  NETWORK_EXPORT_SCHEMA_VERSION,
  type ExportLookups,
} from '../build-network-export.util';
import type { NetworkEntry } from '../../stores/network-log.store';

const AT = '2026-08-21T18:00:00.000Z';

const NO_TRAFFIC: ExportLookups = { messagesFor: () => [], eventsFor: () => [] };

function request(patch: Partial<Extract<NetworkEntry, { kind: 'http' }>> = {}): NetworkEntry {
  return {
    kind: 'http',
    id: 'r1',
    method: 'GET',
    url: 'https://example.test/a',
    status: 'success',
    startedAt: 1000,
    ...patch,
  };
}

function socket(patch: Partial<Extract<NetworkEntry, { kind: 'websocket' }>> = {}): NetworkEntry {
  return {
    kind: 'websocket',
    id: 'ws-1',
    method: 'WS',
    socketId: 1,
    url: 'wss://example.test/socket',
    status: 'open',
    startedAt: 2000,
    ...patch,
  };
}

describe('buildNetworkExport', () => {
  it('says what it is, so an old file can still be read', () => {
    const file = buildNetworkExport([], NO_TRAFFIC, AT);

    expect(file).toMatchObject({
      schemaVersion: NETWORK_EXPORT_SCHEMA_VERSION,
      tool: '@axonpack/expo-devtools',
      exportedAt: AT,
    });
  });

  // The bug this replaces: the export filtered to plain requests, so a socket never appeared at all.
  it('carries a socket, with the messages that belong to it', () => {
    const file = buildNetworkExport(
      [socket()],
      {
        ...NO_TRAFFIC,
        messagesFor: () => [
          { id: 'm1', direction: 'sent', data: 'ping', messageType: 'text', timestamp: 5 },
        ],
      },
      AT
    );

    expect(file.entries[0]).toMatchObject({
      type: 'websocket',
      url: 'wss://example.test/socket',
      messages: [{ direction: 'sent', data: 'ping' }],
    });
  });

  // The other half: a stream arrived as a row whose events had been left behind in the store.
  it('carries a stream’s events, which are its body', () => {
    const file = buildNetworkExport(
      [request({ eventStream: true })],
      {
        ...NO_TRAFFIC,
        eventsFor: () => [{ id: 'e1', type: 'price', data: '42', timestamp: 7 }],
      },
      AT
    );

    expect(file.entries[0]).toMatchObject({
      type: 'http',
      events: [{ type: 'price', data: '42' }],
    });
  });

  it('leaves events off a request that is not a stream', () => {
    const file = buildNetworkExport([request()], NO_TRAFFIC, AT);

    expect(file.entries[0]).not.toHaveProperty('events');
  });

  // A base64 copy of a video makes a file nothing can open, so it says the bytes are absent instead.
  it('says when a response’s bytes were left out rather than carrying them', () => {
    const file = buildNetworkExport([request({ responseBase64: 'AAAA' })], NO_TRAFFIC, AT);

    expect(file.entries[0]).toMatchObject({ responseBytesOmitted: true });
    expect(file.entries[0]).not.toHaveProperty('responseBase64');
  });

  it('counts what is in the file so it can be sized up without reading it', () => {
    const file = buildNetworkExport(
      [request(), request({ id: 'r2', eventStream: true }), socket()],
      {
        messagesFor: () => [
          { id: 'm1', direction: 'sent', data: 'a', messageType: 'text', timestamp: 1 },
          { id: 'm2', direction: 'received', data: 'b', messageType: 'text', timestamp: 2 },
        ],
        eventsFor: () => [{ id: 'e1', type: 'message', data: 'x', timestamp: 3 }],
      },
      AT
    );

    expect(file.summary).toEqual({
      requests: 1,
      sockets: 1,
      streams: 1,
      socketMessages: 2,
      streamEvents: 1,
    });
  });

  // The conditions a request ran under are the panel's own state, not something a reader of the file
  // can act on.
  it('leaves the panel’s own settings out of the file', () => {
    const file = buildNetworkExport(
      [
        request({
          conditions: {
            offline: false,
            throttle: null,
            throttleId: 'none',
            userAgent: null,
            userAgentId: 'none',
          },
        }),
      ],
      NO_TRAFFIC,
      AT
    );

    expect(file.entries[0]).not.toHaveProperty('conditions');
    expect(file.entries[0]).not.toHaveProperty('kind');
  });
});
