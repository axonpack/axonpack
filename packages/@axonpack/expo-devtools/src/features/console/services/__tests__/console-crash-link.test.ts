import { patchConsole } from '../patch-console.service';
import { captureCrash, resetCrashCapture } from '../../../crash/services/capture-crash.service';
import { crashStore } from '../../../crash/stores/crash.store';
import { consoleLogStore } from '../../stores/console-log.store';

/**
 * The link between a console row and a crash report rests on two things that are easy to break from
 * either side: the same `Error` object reaching both, and the crash being recorded *before* React
 * Native re-emits it through `console.error`. Both are asserted here rather than in the stores.
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

  it('carries the id of the crash captured for the very same error', () => {
    const error = new Error('payment gateway timed out');

    // The order React Native uses: our handler captures, then delegates, and the delegate logs.
    const record = captureCrash(error, 'js-fatal');
    console.error(error);

    const [entry] = consoleLogStore.getSnapshot();
    expect(record).not.toBeNull();
    expect(entry?.crashId).toBe(record?.id);
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
    console.error(first);
    const secondRecord = captureCrash(second, 'js-error');
    console.error(second);

    const entries = consoleLogStore.getSnapshot();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.count).toBe(2);
    // The row shows the newest occurrence's time, so it must open the newest occurrence's report.
    expect(entries[0]?.crashId).toBe(secondRecord?.id);
    expect(entries[0]?.crashId).not.toBe(firstRecord?.id);
  });
});
