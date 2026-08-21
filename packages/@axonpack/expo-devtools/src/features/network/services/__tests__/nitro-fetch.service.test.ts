import { applyNitroEntry } from '../nitro-fetch.service';
import { networkLogStore } from '../../stores/network-log.store';

/** The shape the library's own observer hands over, as of `react-native-nitro-fetch`. */
function entry(patch: Record<string, unknown> = {}) {
  return {
    id: 'abc',
    type: 'http',
    url: 'https://example.test/thing',
    method: 'get',
    requestHeaders: [{ key: 'Accept', value: 'application/json' }],
    status: 200,
    statusText: 'OK',
    responseHeaders: [{ key: 'Content-Type', value: 'application/json; charset=utf-8' }],
    responseBody: '{"ok":true}',
    responseBodySize: 11,
    startTime: 1000,
    endTime: 1120,
    duration: 120,
    ...patch,
  };
}

describe('applyNitroEntry', () => {
  beforeAll(() => networkLogStore.setEnabled(true));
  beforeEach(() => networkLogStore.clear());

  it('becomes a row like any other request', () => {
    applyNitroEntry(entry());

    expect(networkLogStore.getSnapshot()[0]).toMatchObject({
      url: 'https://example.test/thing',
      // Upper-cased here, because the row, the grouping and the method filter all read this field.
      method: 'GET',
      status: 'success',
      statusCode: 200,
      duration: 120,
      // Told apart from a patched request by its source, which is the point of naming them.
      source: 'nitro-fetch',
    });
  });

  // That library stamps entries with `performance.now()`, so its 1,000 is a second after the process
  // started, not a second after 1970. Passed through raw, every nitro row sorted to the bottom of the
  // list for ever and dragged the overview strip's range back with it.
  it('reads that library’s clock as the epoch one the rows are in', () => {
    const before = Date.now();
    applyNitroEntry(entry({ startTime: 1000 }));

    const startedAt = networkLogStore.getSnapshot()[0]?.startedAt ?? 0;
    expect(startedAt).toBeGreaterThan(before - 60_000);
    expect(startedAt).toBeLessThan(Date.now() + 60_000);
  });

  it('turns the library’s header pairs into headers', () => {
    applyNitroEntry(entry());

    const row = networkLogStore.getSnapshot()[0];
    expect(row?.requestHeaders).toEqual({ accept: 'application/json' });
    expect(row?.mimeType).toBe('application/json');
  });

  it('reads a failure as one', () => {
    applyNitroEntry(entry({ status: 0, error: 'connection refused' }));

    expect(networkLogStore.getSnapshot()[0]).toMatchObject({
      status: 'error',
      error: 'connection refused',
    });
    expect(networkLogStore.getSnapshot()[0]?.statusCode).toBeUndefined();
  });

  it('works out a duration the entry did not state', () => {
    applyNitroEntry(entry({ duration: undefined }));

    expect(networkLogStore.getSnapshot()[0]?.duration).toBe(120);
  });

  // That client's sockets are as invisible to the rest of this package as its requests: they never
  // reach React Native's WebSocketModule either.
  it('records one of that client’s sockets, with the frames it carried', () => {
    applyNitroEntry({
      id: 'sock',
      type: 'websocket',
      url: 'wss://example.test/socket',
      protocols: ['chat'],
      startTime: 2000,
      duration: 500,
      readyState: 'closed',
      closeCode: 1000,
      messages: [
        { direction: 'sent', data: 'ping', size: 4, isBinary: false, timestamp: 2100 },
        { direction: 'received', data: 'AAAA', size: 3, isBinary: true, timestamp: 2200 },
      ],
    });

    const socket = networkLogStore.getWebSocketSnapshot()[0];
    expect(socket).toMatchObject({
      url: 'wss://example.test/socket',
      method: 'WS',
      source: 'nitro-fetch',
      status: 'closed',
      closeCode: 1000,
      protocols: ['chat'],
    });
    // The frames carry that clock too, so they are converted with the entry.
    expect(networkLogStore.getWebSocketMessages(socket!.id)[0]?.timestamp).toBeGreaterThan(
      Date.now() - 60_000
    );
    expect(networkLogStore.getWebSocketMessages(socket!.id)).toMatchObject([
      { direction: 'sent', data: 'ping', messageType: 'text' },
      // A binary frame is described by its bytes, never invented as text.
      { direction: 'received', data: '[binary 3 bytes]', messageType: 'binary' },
    ]);
  });

  it('skips a kind this version does not know', () => {
    applyNitroEntry({ id: 'x', type: 'sse' } as never);

    expect(networkLogStore.getSnapshot()).toHaveLength(0);
  });
});

describe('the same entry arriving more than once', () => {
  beforeAll(() => networkLogStore.setEnabled(true));
  beforeEach(() => networkLogStore.clear());

  // The library notifies with the *same* socket entry at open, at connect, on every frame, at close
  // and on error. Added blindly, a socket carrying twenty frames became twenty-three rows and two
  // hundred repeated messages — enough to evict every real request from a 200-entry log.
  it('keeps one row and one copy of each frame', () => {
    const socket = {
      id: 'sock',
      type: 'websocket' as const,
      url: 'wss://example.test/socket',
      startTime: 100,
      readyState: 'OPEN',
      messages: [
        { direction: 'sent' as const, data: 'a', size: 1, isBinary: false, timestamp: 110 },
      ],
    };

    applyNitroEntry(socket); // open
    applyNitroEntry(socket); // connected
    socket.messages.push({
      direction: 'received',
      data: 'b',
      size: 1,
      isBinary: false,
      timestamp: 120,
    });
    applyNitroEntry(socket); // a frame arrived

    const rows = networkLogStore.getWebSocketSnapshot();
    expect(rows).toHaveLength(1);
    expect(networkLogStore.getWebSocketMessages(rows[0]!.id).map((m) => m.data)).toEqual([
      'a',
      'b',
    ]);
  });

  it('reads the library’s own casing for a closed socket', () => {
    applyNitroEntry({
      id: 'sock2',
      type: 'websocket',
      url: 'wss://example.test/two',
      startTime: 100,
      // Uppercase, as the library writes it — a comparison against 'closed' never matched.
      readyState: 'CLOSED',
    });

    expect(networkLogStore.getWebSocketSnapshot()[0]?.status).toBe('closed');
  });

  it('patches a request it has already recorded rather than posting it twice', () => {
    applyNitroEntry(entry({ status: 200 }));
    applyNitroEntry(entry({ status: 404, statusText: 'Not Found' }));

    const rows = networkLogStore.getSnapshot();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ statusCode: 404, statusText: 'Not Found' });
  });
});
