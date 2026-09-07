import { consoleLogStore, type ConsoleLogEntry, type ConsoleLogLevel } from '../console-log.store';

function add(level: ConsoleLogLevel, text: string) {
  const entry: ConsoleLogEntry = {
    id: `${level}-${text}`,
    level,
    parts: [{ kind: 'text', text }],
    text,
    timestamp: Date.now(),
    count: 1,
  };
  consoleLogStore.add(entry);
}

describe('consoleLogStore.getErrorCount', () => {
  beforeEach(() => {
    consoleLogStore.clear();
    consoleLogStore.setEnabled(true);
  });

  it('counts errors and crashes, and nothing else', () => {
    add('log', 'a');
    add('warn', 'b');
    expect(consoleLogStore.getErrorCount()).toBe(0);

    add('error', 'c');
    add('crash', 'd');
    expect(consoleLogStore.getErrorCount()).toBe(2);
  });

  it('does not move when a plain line is logged — what keeps a subscriber from re-rendering', () => {
    add('error', 'c');
    const before = consoleLogStore.getErrorCount();

    add('log', 'e');
    add('info', 'f');

    expect(consoleLogStore.getErrorCount()).toBe(before);
  });
});
