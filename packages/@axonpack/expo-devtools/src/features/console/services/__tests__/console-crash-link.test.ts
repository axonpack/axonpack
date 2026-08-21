import { patchConsole } from '../patch-console.service';
import {
  captureCrash,
  configureCrashCapture,
  resetCrashCapture,
} from '../../../crash/services/capture-crash.service';
import { crashStore } from '../../../crash/stores/crash.store';
import { consoleLogStore } from '../../stores/console-log.store';

/**
 * A crash writes its own console row, and the `Error` object's identity is what lets the console
 * patch recognise React Native's re-emit of the same error and leave it alone. Both halves are easy
 * to break from either side, so both are asserted here rather than in the stores.
 */
describe('console rows linked to a crash report', () => {
  beforeAll(() => {
    patchConsole();
  });

  beforeEach(() => {
    resetCrashCapture();
    crashStore.reset();
    consoleLogStore.clear();
    crashStore.setEnabled(true);
    consoleLogStore.setEnabled(true);
  });

  it('writes a row of its own, at the crash level, pointing at the report', () => {
    const error = new Error('payment gateway timed out');

    const record = captureCrash(error, 'js-fatal');

    const [entry] = consoleLogStore.getSnapshot();
    expect(record).not.toBeNull();
    expect(entry?.level).toBe('crash');
    expect(entry?.crashId).toBe(record?.id);
    // Carried so the row can wear the same icon the Crash tab gives that kind.
    expect(entry?.crashKind).toBe('js-fatal');
    // The thrown error itself, so the row renders as one — message, and the stack behind it.
    expect(entry?.parts[0]).toMatchObject({ kind: 'error' });
  });

  // The row exists before the echo arrives, and one crash should be one row.
  it('drops React Native own re-emit of an error already recorded', () => {
    const error = new Error('payment gateway timed out');

    captureCrash(error, 'js-fatal');
    console.error(error);

    expect(consoleLogStore.getSnapshot()).toHaveLength(1);
    expect(consoleLogStore.getSnapshot()[0]?.level).toBe('crash');
  });

  it('writes nothing while the console is paused, since the Crash tab still has it', () => {
    consoleLogStore.setPaused(true);
    try {
      captureCrash(new Error('boom'), 'js-fatal');
      expect(consoleLogStore.getSnapshot()).toEqual([]);
    } finally {
      consoleLogStore.setPaused(false);
    }
  });

  it('records where an error was logged from, and not where a plain log was', () => {
    console.error('something broke');
    console.log('just chatter');

    const [chatter, broke] = consoleLogStore.getSnapshot();
    expect(broke?.callSite?.length).toBeGreaterThan(0);
    // Nobody asks where a `log` came from, and a render loop would pay for a stack every frame.
    expect(chatter?.callSite).toBeUndefined();
  });

  it('leaves an ordinary console error unlinked', () => {
    console.error(new Error('just logging'));

    expect(consoleLogStore.getSnapshot()[0]?.crashId).toBeUndefined();
  });

  it('leaves a message that merely repeats a crash unlinked', () => {
    const error = new Error('payment gateway timed out');
    captureCrash(error, 'js-fatal');

    // Same text, different object — a matcher on message or timestamp would wrongly link this.
    console.error('payment gateway timed out');

    expect(consoleLogStore.getSnapshot()[0]?.crashId).toBeUndefined();
  });

  it('points a coalesced row at the newest of the repeats', () => {
    const first = new Error('boom');
    const second = new Error('boom');

    const firstRecord = captureCrash(first, 'js-error');
    const secondRecord = captureCrash(second, 'js-error');

    const entries = consoleLogStore.getSnapshot();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.count).toBe(2);
    // The row shows the newest occurrence's time, so it must open the newest occurrence's report.
    expect(entries[0]?.crashId).toBe(secondRecord?.id);
    expect(entries[0]?.crashId).not.toBe(firstRecord?.id);
  });

  it('carries the kind, so a native exception is not drawn as a fatal JS error', () => {
    captureCrash(new Error('objc threw'), 'native-exception');

    expect(consoleLogStore.getSnapshot()[0]?.crashKind).toBe('native-exception');
  });

  // The row shows the same two chips the Crash tab's row does, and the trail length is one of them.
  it('carries how many breadcrumbs the report came with', () => {
    configureCrashCapture({ breadcrumbs: true });
    console.log('something happened first');
    captureCrash(new Error('boom'), 'js-fatal');

    const row = consoleLogStore.getSnapshot().find((entry) => entry.level === 'crash');
    expect(row?.crashBreadcrumbs).toBeGreaterThan(0);
  });
});
