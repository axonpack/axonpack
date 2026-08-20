import { crashStore, type CrashRecord } from '../crash.store';

function record(id: string, patch: Partial<CrashRecord> = {}): CrashRecord {
  return {
    id,
    kind: 'js-error',
    name: 'TypeError',
    message: `boom ${id}`,
    stack: null,
    fromPreviousLaunch: false,
    timestamp: 1,
    seen: false,
    ...patch,
  };
}

beforeEach(() => {
  crashStore.reset();
  crashStore.setEnabled(true);
});

describe('crashStore gate', () => {
  it('drops records until enabled, which is what makes shipping the code free', () => {
    crashStore.reset();
    crashStore.add(record('a'));
    expect(crashStore.getSnapshot()).toEqual([]);

    crashStore.setEnabled(true);
    crashStore.add(record('b'));
    expect(crashStore.getSnapshot()).toHaveLength(1);
  });
});

describe('crashStore buffer', () => {
  it('keeps the newest record first', () => {
    crashStore.add(record('a'));
    crashStore.add(record('b'));
    expect(crashStore.getSnapshot().map((entry) => entry.id)).toEqual(['b', 'a']);
  });

  it('drops the oldest past the cap', () => {
    crashStore.setMaxRecords(2);
    crashStore.add(record('a'));
    crashStore.add(record('b'));
    crashStore.add(record('c'));
    expect(crashStore.getSnapshot().map((entry) => entry.id)).toEqual(['c', 'b']);
  });
});

describe('crashStore seen flags', () => {
  it('marks one record seen without touching the others', () => {
    crashStore.add(record('a'));
    crashStore.add(record('b'));
    crashStore.markSeen('a');

    const byId = Object.fromEntries(crashStore.getSnapshot().map((e) => [e.id, e.seen]));
    expect(byId).toEqual({ a: true, b: false });
  });

  it('marks every record seen at once', () => {
    crashStore.add(record('a'));
    crashStore.add(record('b'));
    crashStore.markAllSeen();
    expect(crashStore.getSnapshot().every((entry) => entry.seen)).toBe(true);
  });

  it('notifies subscribers on change', () => {
    const listener = jest.fn();
    const unsubscribe = crashStore.subscribe(listener);
    crashStore.add(record('a'));
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });
});
