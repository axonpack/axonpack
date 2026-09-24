import { buildMatcher, DEFAULT_SEARCH_MODES } from '../../../../core/utils/text-search.util';
import type { CrashRecord } from '../../stores/crash.store';
import {
  countByKind,
  DEFAULT_CRASH_FILTERS,
  filterCrashRecords,
  toggleKind,
} from '../filter-crash-records.util';

function record(partial: Partial<CrashRecord>): CrashRecord {
  return {
    id: 'r',
    kind: 'js-error',
    name: 'Error',
    message: '',
    stack: null,
    fromPreviousLaunch: false,
    timestamp: 0,
    seen: false,
    ...partial,
  };
}

const records = [
  record({ id: 'a', kind: 'js-fatal', name: 'TypeError', message: 'x is undefined' }),
  record({ id: 'b', kind: 'js-error', message: 'boom', stack: 'at Checkout (App.tsx:1:1)' }),
  record({ id: 'c', kind: 'native-exception', message: 'boom' }),
];

const ids = (list: CrashRecord[]) => list.map((current) => current.id);

describe('filterCrashRecords', () => {
  it('keeps everything with no filters', () => {
    expect(filterCrashRecords(records, DEFAULT_CRASH_FILTERS, null)).toHaveLength(3);
  });

  it('matches the name, the message and the stack', () => {
    const match = (text: string) =>
      ids(
        filterCrashRecords(
          records,
          DEFAULT_CRASH_FILTERS,
          buildMatcher({ text, ...DEFAULT_SEARCH_MODES })
        )
      );
    expect(match('typeerror')).toEqual(['a']);
    expect(match('boom')).toEqual(['b', 'c']);
    expect(match('checkout')).toEqual(['b']);
  });

  it('keeps any of several kinds', () => {
    const filters = { ...DEFAULT_CRASH_FILTERS, kinds: toggleKind(['js-fatal'], 'js-error') };
    expect(ids(filterCrashRecords(records, filters, null))).toEqual(['a', 'b']);
    expect(toggleKind(filters.kinds, 'js-fatal')).toEqual(['js-error']);
  });

  it('counts per kind', () => {
    expect(countByKind(records)).toEqual({ 'js-fatal': 1, 'js-error': 1, 'native-exception': 1 });
  });
});
