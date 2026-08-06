import { consoleLogStore } from '../../stores/console/console-log.store';
import type { ConsoleLogLevel } from '../../stores/console/console-log.store';
import { getConsoleArgsText, toConsoleArgs } from '../../utils/console/format-console-args.util';

const LEVELS: ConsoleLogLevel[] = ['log', 'info', 'warn', 'error', 'debug'];

let isPatched = false;
let entryCounter = 0;

function nextEntryId(): string {
  entryCounter += 1;
  return `console-${Date.now()}-${entryCounter}`;
}

/**
 * Wraps each `console.*` method and forwards to whatever was there before, so React Native's own
 * LogBox (which patches `console.error`/`console.warn` itself) keeps working — the yellow/red box
 * still appears, we just also record the call.
 */
export function patchConsole() {
  if (isPatched) return;
  isPatched = true;

  for (const level of LEVELS) {
    const original = console[level]?.bind(console);

    console[level] = (...args: unknown[]) => {
      try {
        const parts = toConsoleArgs(args);
        consoleLogStore.add({
          id: nextEntryId(),
          level,
          parts,
          text: getConsoleArgsText(parts),
          timestamp: Date.now(),
          count: 1,
        });
      } catch {
        // Serializing an exotic value must never take down the app's own logging — drop the entry
        // and still hand the call to the original console method below.
      }

      original?.(...args);
    };
  }
}
