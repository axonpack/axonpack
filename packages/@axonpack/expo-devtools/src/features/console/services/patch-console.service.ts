import { crashLinkStore } from '../../../core/stores/crash-link.store';
import { consoleLogStore } from '../stores/console-log.store';
import type { ConsoleLogLevel } from '../stores/console-log.store';
import { getConsoleArgsText, toConsoleArgs } from '../utils/format-console-args.util';
import { NATIVE_CONSOLE_SOURCE } from '../utils/formatters.util';

type PatchedLevel = Extract<ConsoleLogLevel, 'log' | 'info' | 'warn' | 'error' | 'debug'>;

const LEVELS: PatchedLevel[] = ['log', 'info', 'warn', 'error', 'debug'];

let isPatched = false;
let entryCounter = 0;

function nextEntryId(): string {
  entryCounter += 1;
  return `console-${Date.now()}-${entryCounter}`;
}

/**
 * An uncaught error reaches the console as React Native's own re-emit of the error it already
 * reported as a crash, so the row can carry the report rather than duplicate it.
 */
function findCrashId(args: unknown[]): string | undefined {
  for (const arg of args) {
    const crashId = crashLinkStore.find(arg);
    if (crashId !== undefined) return crashId;
  }
  return undefined;
}

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
          source: NATIVE_CONSOLE_SOURCE,
          crashId: findCrashId(args),
        });
      } catch {}

      original?.(...args);
    };
  }
}
