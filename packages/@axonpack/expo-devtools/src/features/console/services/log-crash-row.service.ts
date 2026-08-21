import type { CrashRecord } from '../../crash/stores/crash.store';
import { consoleLogStore } from '../stores/console-log.store';
import { getConsoleArgsText, type ConsoleArg } from '../utils/format-console-args.util';

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
export function logCrashRow(record: CrashRecord) {
  counter += 1;
  // Built from the record rather than from a thrown value: a crash read back from disk never had an
  // `Error` object in this process, and fabricating one to hand to the formatter would be pretence.
  const parts: ConsoleArg[] = [
    { kind: 'error', text: `${record.name}: ${record.message}`, stack: record.stack ?? undefined },
  ];

  consoleLogStore.add({
    id: `crash-row-${counter}`,
    level: 'crash',
    parts,
    text: getConsoleArgsText(parts),
    timestamp: record.timestamp,
    count: 1,
    crashId: record.id,
    crashKind: record.kind,
    crashBreadcrumbs: record.breadcrumbs?.length,
    crashName: record.name,
    crashMessage: record.message,
    crashFromPreviousLaunch: record.fromPreviousLaunch,
  });
}
