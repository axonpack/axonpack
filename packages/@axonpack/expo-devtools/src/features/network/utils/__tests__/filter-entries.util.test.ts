import type { NetworkLogEntry, WebSocketLogEntry } from '../../stores/network-log.store';
import { buildMatcher, DEFAULT_SEARCH_MODES } from '../../../../core/utils/text-search.util';
import {
  compileNetworkFilters,
  DEFAULT_NETWORK_FILTERS,
  hasActiveFilters,
  isUnreadable,
  matchesFilters,
  matchesSocketFilters,
  sortStatusClasses,
  statusClass,
  statusClassLabel,
  type NetworkFilters,
} from '../filter-entries.util';

function entryWith(overrides: Partial<NetworkLogEntry> = {}): NetworkLogEntry {
  return {
    id: 'a',
    method: 'GET',
    url: 'https://example.dev/api/users',
    status: 'success',
    statusCode: 200,
    startedAt: 0,
    ...overrides,
  };
}

function filtersWith(overrides: Partial<NetworkFilters> = {}): NetworkFilters {
  return { ...DEFAULT_NETWORK_FILTERS, ...overrides };
}

function matcherFor(text: string) {
  return buildMatcher({ text, ...DEFAULT_SEARCH_MODES });
}

/** The two expressions and the four thresholds are read once, so every call site takes the pair. */
function matches(
  entry: NetworkLogEntry,
  filters: NetworkFilters,
  matcher: ReturnType<typeof matcherFor> = null
) {
  return matchesFilters(entry, filters, matcher, compileNetworkFilters(filters));
}

function socketWith(overrides: Partial<WebSocketLogEntry> = {}): WebSocketLogEntry {
  return {
    kind: 'websocket',
    id: 's1',
    socketId: 1,
    method: 'WS',
    url: 'wss://example.dev/live',
    status: 'open',
    startedAt: 0,
    ...overrides,
  };
}

function socketMatches(entry: WebSocketLogEntry, filters: NetworkFilters) {
  return matchesSocketFilters(entry, filters, null, compileNetworkFilters(filters));
}

describe('statusClass', () => {
  it('bands a response by its code', () => {
    expect(statusClass(entryWith({ statusCode: 204 }))).toBe('2xx');
    expect(statusClass(entryWith({ statusCode: 301 }))).toBe('3xx');
    expect(statusClass(entryWith({ statusCode: 404 }))).toBe('4xx');
    expect(statusClass(entryWith({ statusCode: 503 }))).toBe('5xx');
  });

  it('separates the two states that have no code', () => {
    expect(statusClass(entryWith({ statusCode: undefined, status: 'error' }))).toBe('failed');
    expect(statusClass(entryWith({ statusCode: undefined, status: 'pending' }))).toBe('pending');
  });

  it('labels the codeless states in words and leaves bands alone', () => {
    expect(statusClassLabel('failed')).toBe('Failed');
    expect(statusClassLabel('pending')).toBe('Pending');
    expect(statusClassLabel('4xx')).toBe('4xx');
  });

  it('orders bands numerically, then the codeless states', () => {
    expect(sortStatusClasses(['pending', '4xx', 'failed', '2xx'])).toEqual([
      '2xx',
      '4xx',
      'failed',
      'pending',
    ]);
  });
});

describe('matchesFilters', () => {
  it('keeps everything when no filter is set', () => {
    expect(matches(entryWith(), DEFAULT_NETWORK_FILTERS)).toBe(true);
  });

  it('matches the search against method, url, status code and source', () => {
    const entry = entryWith({ source: 'my-webview' });
    expect(matches(entry, filtersWith(), matcherFor('users'))).toBe(true);
    expect(matches(entry, filtersWith(), matcherFor('200'))).toBe(true);
    expect(matches(entry, filtersWith(), matcherFor('my-webview'))).toBe(true);
    expect(matches(entry, filtersWith(), matcherFor('nope'))).toBe(false);
  });

  it('reads the status filter as an expression, not only as a band', () => {
    const failing = entryWith({ statusCode: 500 });
    expect(matches(failing, filtersWith({ statusQuery: '5xx' }))).toBe(true);
    expect(matches(failing, filtersWith({ statusQuery: '2xx' }))).toBe(false);
    expect(matches(failing, filtersWith({ statusQuery: '>= 400' }))).toBe(true);
    expect(matches(failing, filtersWith({ statusQuery: '500-599' }))).toBe(true);
    expect(matches(failing, filtersWith({ statusQuery: '500' }))).toBe(true);
    expect(matches(failing, filtersWith({ statusQuery: '404' }))).toBe(false);
  });

  // Emptying the list on the way to a valid expression reads as the filter being broken.
  it('ignores an expression it cannot read, rather than matching nothing', () => {
    expect(matches(entryWith(), filtersWith({ statusQuery: '>=' }))).toBe(true);
    expect(
      isUnreadable('>=', compileNetworkFilters(filtersWith({ statusQuery: '>=' })).status)
    ).toBe(true);
  });

  it('takes more than one method or source at a time', () => {
    const post = entryWith({ method: 'POST' });
    expect(matches(post, filtersWith({ methods: ['GET', 'POST'] }))).toBe(true);
    expect(matches(post, filtersWith({ methods: ['GET', 'PUT'] }))).toBe(false);

    const fromPage = entryWith({ source: 'shop' });
    expect(matches(fromPage, filtersWith({ sources: ['shop', 'nitro-fetch'] }))).toBe(true);
    expect(matches(fromPage, filtersWith({ sources: ['nitro-fetch'] }))).toBe(false);
    // No source at all cannot be one of the ones asked for.
    expect(matches(entryWith(), filtersWith({ sources: ['shop'] }))).toBe(false);
  });

  it('filters by how large and how slow a request was, units included', () => {
    const entry = entryWith({ size: 30 * 1024, duration: 1200 });
    expect(matches(entry, filtersWith({ minSize: '20kb' }))).toBe(true);
    expect(matches(entry, filtersWith({ minSize: '1mb' }))).toBe(false);
    expect(matches(entry, filtersWith({ maxSize: '20kb' }))).toBe(false);
    expect(matches(entry, filtersWith({ minDuration: '1s' }))).toBe(true);
    expect(matches(entry, filtersWith({ maxDuration: '800ms' }))).toBe(false);
  });

  // A threshold is a question about a figure, and an entry without the figure has not answered it.
  it('excludes an entry that has no figure to compare', () => {
    const pending = entryWith({ status: 'pending', statusCode: undefined });
    expect(matches(pending, filtersWith({ minDuration: '0' }))).toBe(false);
    expect(matches(pending, filtersWith({ maxSize: '1mb' }))).toBe(false);
  });

  it('shows only what is still in flight, or only what a rule answered', () => {
    const pending = entryWith({ status: 'pending', statusCode: undefined });
    expect(matches(pending, filtersWith({ inFlightOnly: true }))).toBe(true);
    expect(matches(entryWith(), filtersWith({ inFlightOnly: true }))).toBe(false);

    const overridden = entryWith({ intercepted: 'overridden' });
    expect(matches(overridden, filtersWith({ interceptedOnly: true }))).toBe(true);
    expect(matches(entryWith(), filtersWith({ interceptedOnly: true }))).toBe(false);
  });

  it('inverts every part of the match, not just the search text', () => {
    const entry = entryWith({ method: 'POST' });
    expect(matches(entry, filtersWith({ methods: ['POST'], invert: true }))).toBe(false);
    expect(matches(entry, filtersWith({ methods: ['GET'], invert: true }))).toBe(true);
    expect(matches(entry, filtersWith({ invert: true }), matcherFor('users'))).toBe(false);
  });

  it('leaves the hide toggles out of the inversion', () => {
    const dataUrl = entryWith({ url: 'data:image/png;base64,AAA' });
    expect(matches(dataUrl, filtersWith({ hideDataUrls: true, invert: true }))).toBe(false);

    const failed = entryWith({ status: 'error', statusCode: undefined });
    expect(matches(failed, filtersWith({ hideFailed: true, invert: true }))).toBe(false);
  });
});

describe('matchesSocketFilters', () => {
  it('keeps a socket while nothing it has no answer for is being asked', () => {
    expect(socketMatches(socketWith(), DEFAULT_NETWORK_FILTERS)).toBe(true);
    expect(socketMatches(socketWith(), filtersWith({ methods: ['WS'] }))).toBe(true);
  });

  // It has no status code, no resource type, no size, and nothing intercepts one.
  it('drops out of any filter a socket has no figure for', () => {
    expect(socketMatches(socketWith(), filtersWith({ statusQuery: '2xx' }))).toBe(false);
    expect(socketMatches(socketWith(), filtersWith({ minSize: '1kb' }))).toBe(false);
    expect(socketMatches(socketWith(), filtersWith({ interceptedOnly: true }))).toBe(false);
  });

  it('is in flight while it is open, and timed once it has closed', () => {
    expect(socketMatches(socketWith(), filtersWith({ inFlightOnly: true }))).toBe(true);
    expect(
      socketMatches(
        socketWith({ status: 'closed', duration: 900 }),
        filtersWith({ inFlightOnly: true })
      )
    ).toBe(false);
    expect(
      socketMatches(
        socketWith({ status: 'closed', duration: 900 }),
        filtersWith({ minDuration: '1s' })
      )
    ).toBe(false);
    expect(
      socketMatches(
        socketWith({ status: 'closed', duration: 900 }),
        filtersWith({ maxDuration: '1s' })
      )
    ).toBe(true);
  });
});

describe('hasActiveFilters', () => {
  it('is false for the defaults', () => {
    expect(hasActiveFilters(DEFAULT_NETWORK_FILTERS)).toBe(false);
  });

  it('is true once any single filter is set', () => {
    expect(hasActiveFilters(filtersWith({ search: 'x' }))).toBe(true);
    expect(hasActiveFilters(filtersWith({ invert: true }))).toBe(true);
    expect(hasActiveFilters(filtersWith({ statusQuery: '4xx' }))).toBe(true);
    expect(hasActiveFilters(filtersWith({ methods: ['GET'] }))).toBe(true);
    expect(hasActiveFilters(filtersWith({ minDuration: '500ms' }))).toBe(true);
    expect(hasActiveFilters(filtersWith({ inFlightOnly: true }))).toBe(true);
    expect(hasActiveFilters(filtersWith({ interceptedOnly: true }))).toBe(true);
    expect(hasActiveFilters(filtersWith({ hideDataUrls: true }))).toBe(true);
  });

  it('ignores search modes on their own — they do nothing without a query', () => {
    expect(hasActiveFilters(filtersWith({ modes: { ...DEFAULT_SEARCH_MODES, regex: true } }))).toBe(
      false
    );
  });
});
