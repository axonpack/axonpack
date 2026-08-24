import { matchesStatusQuery, parseStatusQuery } from '../status-query.util';

describe('parseStatusQuery', () => {
  it('reads one code, a band, a range and a comparison', () => {
    expect(parseStatusQuery('404')).toEqual({ kind: 'code', code: 404 });
    expect(parseStatusQuery('4xx')).toEqual({ kind: 'band', band: 4 });
    expect(parseStatusQuery('200-299')).toEqual({ kind: 'range', min: 200, max: 299 });
    expect(parseStatusQuery('>= 400')).toEqual({ kind: 'compare', op: '>=', code: 400 });
    expect(parseStatusQuery('<300')).toEqual({ kind: 'compare', op: '<', code: 300 });
  });

  it('reads the two states that have no code, in words', () => {
    expect(parseStatusQuery('failed')).toEqual({ kind: 'state', state: 'failed' });
    expect(parseStatusQuery(' Pending ')).toEqual({ kind: 'state', state: 'pending' });
  });

  // A range typed backwards is a range, not a mistake worth refusing.
  it('puts a backwards range the right way round', () => {
    expect(parseStatusQuery('299-200')).toEqual({ kind: 'range', min: 200, max: 299 });
  });

  it('returns nothing for what it cannot read, including a half-typed comparison', () => {
    expect(parseStatusQuery('')).toBeNull();
    expect(parseStatusQuery('>=')).toBeNull();
    expect(parseStatusQuery('6xx')).toBeNull();
    expect(parseStatusQuery('20')).toBeNull();
    expect(parseStatusQuery('ok')).toBeNull();
  });
});

describe('matchesStatusQuery', () => {
  const responded = { statusCode: 503, failed: false, pending: false };
  const pending = { failed: false, pending: true };
  const failed = { failed: true, pending: false };

  it('compares a code every way an expression can ask', () => {
    expect(matchesStatusQuery(responded, { kind: 'code', code: 503 })).toBe(true);
    expect(matchesStatusQuery(responded, { kind: 'band', band: 5 })).toBe(true);
    expect(matchesStatusQuery(responded, { kind: 'band', band: 4 })).toBe(false);
    expect(matchesStatusQuery(responded, { kind: 'range', min: 500, max: 599 })).toBe(true);
    expect(matchesStatusQuery(responded, { kind: 'compare', op: '>=', code: 400 })).toBe(true);
    expect(matchesStatusQuery(responded, { kind: 'compare', op: '<', code: 500 })).toBe(false);
  });

  // A request still in flight is not a 200 that has not arrived yet.
  it('matches nothing that compares a code when there is no code', () => {
    expect(matchesStatusQuery(pending, { kind: 'band', band: 2 })).toBe(false);
    expect(matchesStatusQuery(pending, { kind: 'compare', op: '<', code: 600 })).toBe(false);
  });

  it('answers the two states by their own names', () => {
    expect(matchesStatusQuery(pending, { kind: 'state', state: 'pending' })).toBe(true);
    expect(matchesStatusQuery(failed, { kind: 'state', state: 'failed' })).toBe(true);
    expect(matchesStatusQuery(failed, { kind: 'state', state: 'pending' })).toBe(false);
  });
});
