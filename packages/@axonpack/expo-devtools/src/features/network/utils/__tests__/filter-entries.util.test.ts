import type { NetworkLogEntry } from '../../stores/network-log.store';
import { buildMatcher, DEFAULT_SEARCH_MODES } from '../../../../core/utils/text-search.util';
import {
  DEFAULT_NETWORK_FILTERS,
  hasActiveFilters,
  matchesFilters,
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
    expect(matchesFilters(entryWith(), DEFAULT_NETWORK_FILTERS, null)).toBe(true);
  });

  it('matches the search against method, url, status code and source', () => {
    const entry = entryWith({ source: 'my-webview' });
    expect(matchesFilters(entry, filtersWith(), matcherFor('users'))).toBe(true);
    expect(matchesFilters(entry, filtersWith(), matcherFor('200'))).toBe(true);
    expect(matchesFilters(entry, filtersWith(), matcherFor('my-webview'))).toBe(true);
    expect(matchesFilters(entry, filtersWith(), matcherFor('nope'))).toBe(false);
  });

  it('filters by status band', () => {
    const failing = entryWith({ statusCode: 500 });
    expect(matchesFilters(failing, filtersWith({ status: '5xx' }), null)).toBe(true);
    expect(matchesFilters(failing, filtersWith({ status: '2xx' }), null)).toBe(false);
  });

  it('inverts every part of the match, not just the search text', () => {
    const entry = entryWith({ method: 'POST' });
    expect(matchesFilters(entry, filtersWith({ method: 'POST', invert: true }), null)).toBe(false);
    expect(matchesFilters(entry, filtersWith({ method: 'GET', invert: true }), null)).toBe(true);
    expect(matchesFilters(entry, filtersWith({ invert: true }), matcherFor('users'))).toBe(false);
  });

  it('leaves the hide toggles out of the inversion', () => {
    const dataUrl = entryWith({ url: 'data:image/png;base64,AAA' });
    expect(matchesFilters(dataUrl, filtersWith({ hideDataUrls: true, invert: true }), null)).toBe(
      false
    );

    const failed = entryWith({ status: 'error', statusCode: undefined });
    expect(matchesFilters(failed, filtersWith({ hideFailed: true, invert: true }), null)).toBe(
      false
    );
  });
});

describe('hasActiveFilters', () => {
  it('is false for the defaults', () => {
    expect(hasActiveFilters(DEFAULT_NETWORK_FILTERS)).toBe(false);
  });

  it('is true once any single filter is set', () => {
    expect(hasActiveFilters(filtersWith({ search: 'x' }))).toBe(true);
    expect(hasActiveFilters(filtersWith({ invert: true }))).toBe(true);
    expect(hasActiveFilters(filtersWith({ status: '4xx' }))).toBe(true);
    expect(hasActiveFilters(filtersWith({ hideDataUrls: true }))).toBe(true);
  });

  it('ignores search modes on their own — they do nothing without a query', () => {
    expect(hasActiveFilters(filtersWith({ modes: { ...DEFAULT_SEARCH_MODES, regex: true } }))).toBe(
      false
    );
  });
});
