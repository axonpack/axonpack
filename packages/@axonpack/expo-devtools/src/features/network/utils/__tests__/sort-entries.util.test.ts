import type {
  NetworkEntry,
  NetworkLogEntry,
  WebSocketLogEntry,
} from '../../stores/network-log.store';
import { sortDirectionLabel, sortEntries } from '../sort-entries.util';

function request(overrides: Partial<NetworkLogEntry> = {}): NetworkLogEntry {
  return {
    kind: 'http',
    id: 'r',
    method: 'GET',
    url: 'https://example.dev/a',
    status: 'success',
    startedAt: 0,
    ...overrides,
  };
}

function socket(overrides: Partial<WebSocketLogEntry> = {}): WebSocketLogEntry {
  return {
    kind: 'websocket',
    id: 's',
    socketId: 1,
    method: 'WS',
    url: 'wss://example.dev/live',
    status: 'open',
    startedAt: 0,
    ...overrides,
  };
}

const ids = (entries: NetworkEntry[]) => entries.map((entry) => entry.id);

describe('sortEntries', () => {
  it('orders by when it started, either way round', () => {
    const entries = [
      request({ id: 'b', startedAt: 200 }),
      request({ id: 'a', startedAt: 100 }),
      request({ id: 'c', startedAt: 300 }),
    ];

    expect(ids(sortEntries(entries, { key: 'time', descending: false }))).toEqual(['a', 'b', 'c']);
    expect(ids(sortEntries(entries, { key: 'time', descending: true }))).toEqual(['c', 'b', 'a']);
  });

  it('orders by size, by duration and by status code', () => {
    const entries = [
      request({ id: 'small', size: 100, duration: 900, statusCode: 500 }),
      request({ id: 'big', size: 9000, duration: 20, statusCode: 200 }),
    ];

    expect(ids(sortEntries(entries, { key: 'size', descending: true }))).toEqual(['big', 'small']);
    expect(ids(sortEntries(entries, { key: 'duration', descending: true }))).toEqual([
      'small',
      'big',
    ]);
    expect(ids(sortEntries(entries, { key: 'status', descending: true }))).toEqual([
      'small',
      'big',
    ]);
  });

  // A pending request at the top of "slowest first" would read as the slowest one.
  it('leaves what it cannot compare at the end, whichever way the arrow points', () => {
    const entries = [
      request({ id: 'pending', status: 'pending' }),
      request({ id: 'done', duration: 40 }),
    ];

    expect(ids(sortEntries(entries, { key: 'duration', descending: true }))).toEqual([
      'done',
      'pending',
    ]);
    expect(ids(sortEntries(entries, { key: 'duration', descending: false }))).toEqual([
      'done',
      'pending',
    ]);
  });

  it('keeps a socket in the list, and out of the orders it has no figure for', () => {
    const entries = [socket({ id: 'sock', duration: 5000 }), request({ id: 'req', size: 10 })];

    // It has a duration of its own, so it sorts on that like anything else.
    expect(ids(sortEntries(entries, { key: 'duration', descending: true }))).toEqual([
      'sock',
      'req',
    ]);
    // It has no size, so it falls to the end rather than counting as zero.
    expect(ids(sortEntries(entries, { key: 'size', descending: false }))).toEqual(['req', 'sock']);
  });
});

describe('sortDirectionLabel', () => {
  it('says what the arrow means in the vocabulary of the key', () => {
    expect(sortDirectionLabel({ key: 'time', descending: true })).toBe('Newest first');
    expect(sortDirectionLabel({ key: 'size', descending: true })).toBe('Largest first');
    expect(sortDirectionLabel({ key: 'duration', descending: true })).toBe('Slowest first');
    expect(sortDirectionLabel({ key: 'duration', descending: false })).toBe('Fastest first');
  });
});
