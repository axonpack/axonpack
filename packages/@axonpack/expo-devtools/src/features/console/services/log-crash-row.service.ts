import { consoleLogStore } from '../stores/console-log.store';
import { getConsoleArgsText, toConsoleArgs } from '../utils/format-console-args.util';

let counter = 0;

/**
 * Puts a crash in the console stream, the way anything else that happened would be.
 *
 * The crash feature calls this rather than writing the row itself, so the formatting of a console row
 * stays inside the console feature. The value handed over is the thrown error itself, not a summary
 * of it: an `Error` becomes the row shape that already exists for one — `name: message` with the
 * stack behind a disclosure arrow — and the crash id turns the message into a way into the full
 * report, which is the same stack symbolicated, with breadcrumbs and device details around it.
 *
 * Nothing is forced past the record button. A paused console is one somebody asked to stop writing
 * to, and the Crash tab has the report either way.
 */
export function logCrashRow(error: unknown, crashId: string, timestamp: number) {
  counter += 1;
  const parts = toConsoleArgs([error]);

  consoleLogStore.add({
    id: `crash-row-${counter}`,
    level: 'crash',
    parts,
    text: getConsoleArgsText(parts),
    timestamp,
    count: 1,
    crashId,
  });
}
