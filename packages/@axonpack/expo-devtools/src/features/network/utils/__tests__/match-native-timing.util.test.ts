import { matchNativeTiming, type NativeTimingReport } from '../match-native-timing.util';
import type { NetworkLogEntry } from '../../stores/network-log.store';

function entry(patch: Partial<NetworkLogEntry>): NetworkLogEntry {
  return {
    kind: 'http',
    id: 'e1',
    method: 'GET',
    url: 'https://example.test/a',
    status: 'success',
    startedAt: 1000,
    ...patch,
  };
}

function report(patch: Partial<NativeTimingReport> = {}): NativeTimingReport {
  return {
    url: 'https://example.test/a',
    startMs: 1000,
    phases: { measuredBy: 'urlsession' },
    ...patch,
  };
}

describe('matchNativeTiming', () => {
  it('attaches a reading to the row for the same URL', () => {
    expect(matchNativeTiming(report(), [entry({})])?.id).toBe('e1');
  });

  it('ignores a row for a different URL', () => {
    expect(matchNativeTiming(report(), [entry({ url: 'https://example.test/b' })])).toBeUndefined();
  });

  // The same URL requested twice at once is the case no id can disambiguate, so the closest start
  // wins and the other row waits for its own reading.
  it('picks the row that started closest to the native reading', () => {
    const match = matchNativeTiming(report({ startMs: 5000 }), [
      entry({ id: 'early', startedAt: 1000 }),
      entry({ id: 'close', startedAt: 4980 }),
    ]);

    expect(match?.id).toBe('close');
  });

  it('leaves a row that already has phases alone, so two readings never share one row', () => {
    const match = matchNativeTiming(report(), [
      entry({ id: 'taken', phases: { measuredBy: 'urlsession' } }),
      entry({ id: 'free' }),
    ]);

    expect(match?.id).toBe('free');
  });

  it('refuses a reading too far from anything to be the same request', () => {
    expect(matchNativeTiming(report({ startMs: 60_000 }), [entry({})])).toBeUndefined();
  });

  it('has nothing to say about an empty log', () => {
    expect(matchNativeTiming(report(), [])).toBeUndefined();
  });
});
