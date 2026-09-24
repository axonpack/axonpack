import { buildMatcher, DEFAULT_SEARCH_MODES } from '../../../../core/utils/text-search.util';
import type { ConsoleLogEntry } from '../../stores/console-log.store';
import {
  countByLevel,
  DEFAULT_CONSOLE_FILTERS,
  filterConsoleEntries,
  listSources,
} from '../filter-console-entries.util';

function entry(partial: Partial<ConsoleLogEntry>): ConsoleLogEntry {
  return { id: 'e', level: 'log', parts: [], text: '', timestamp: 0, count: 1, ...partial };
}

const entries = [
  entry({ id: 'a', level: 'log', text: 'hello', source: 'native' }),
  entry({ id: 'b', level: 'warn', text: 'Hello there', source: 'native' }),
  entry({ id: 'c', level: 'error', text: 'boom', source: 'checkout' }),
];

describe('filterConsoleEntries', () => {
  it('keeps everything with no filters', () => {
    expect(filterConsoleEntries(entries, DEFAULT_CONSOLE_FILTERS, null)).toHaveLength(3);
  });

  it('applies level, source and search together', () => {
    const matcher = buildMatcher({ text: 'hello', ...DEFAULT_SEARCH_MODES });
    const ids = (filters: Partial<typeof DEFAULT_CONSOLE_FILTERS>, m = matcher) =>
      filterConsoleEntries(entries, { ...DEFAULT_CONSOLE_FILTERS, ...filters }, m).map((e) => e.id);

    expect(ids({})).toEqual(['a', 'b']);
    expect(ids({ level: 'warn' })).toEqual(['b']);
    expect(ids({ source: 'checkout' }, null)).toEqual(['c']);
  });
});

describe('countByLevel and listSources', () => {
  it('counts per level', () => {
    expect(countByLevel(entries)).toEqual({ log: 1, warn: 1, error: 1 });
  });

  it('lists sources only once there is more than one', () => {
    expect(listSources(entries)).toEqual(['native', 'checkout']);
    expect(listSources(entries.slice(0, 2))).toEqual([]);
  });
});
