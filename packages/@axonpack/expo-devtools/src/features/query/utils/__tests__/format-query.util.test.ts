import type { QueryRow } from '../../stores/query.store';
import { formatKey, queryStatusLabel, toJsonValue } from '../format-query.util';

function row(patch: Partial<QueryRow>): QueryRow {
  return {
    hash: '["a"]',
    query: {} as QueryRow['query'],
    status: 'success',
    fetchStatus: 'idle',
    updatedAt: 1,
    observers: 1,
    stale: false,
    data: null,
    error: null,
    forced: null,
    ...patch,
  };
}

describe('queryStatusLabel', () => {
  it('puts what the fetch is doing ahead of the data', () => {
    expect(queryStatusLabel(row({ fetchStatus: 'fetching' }))).toBe('fetching');
    expect(queryStatusLabel(row({ fetchStatus: 'paused', status: 'pending' }))).toBe('paused');
  });

  it('calls out stale and unobserved data', () => {
    expect(queryStatusLabel(row({ stale: true }))).toBe('stale');
    expect(queryStatusLabel(row({ observers: 0 }))).toBe('inactive');
    expect(queryStatusLabel(row({}))).toBe('success');
    expect(queryStatusLabel(row({ status: 'error' }))).toBe('error');
  });
});

describe('formatKey', () => {
  it('falls back when a mutation has no key', () => {
    expect(formatKey(['add', 1], 'x')).toBe('["add",1]');
    expect(formatKey(undefined, 'Mutation #3')).toBe('Mutation #3');
  });
});

describe('toJsonValue', () => {
  it('turns what JSON cannot hold into text instead of throwing', () => {
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    expect(typeof toJsonValue(cycle)).toBe('string');
    expect(toJsonValue(new Error('boom'))).toBe('Error: boom');
    expect(toJsonValue({ at: new Date(0) })).toEqual({ at: '1970-01-01T00:00:00.000Z' });
  });
});
