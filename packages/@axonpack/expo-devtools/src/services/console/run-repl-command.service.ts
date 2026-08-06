import { evaluateExpression } from './evaluate-expression.service';
import { consoleLogStore } from '../../stores/console/console-log.store';
import type { ConsoleLogLevel } from '../../stores/console/console-log.store';
import { getConsoleArgsText, toConsoleArgs } from '../../utils/console/format-console-args.util';
import { NATIVE_CONSOLE_SOURCE } from '../../utils/console/formatters.util';

let commandCounter = 0;

function nextEntryId(): string {
  commandCounter += 1;
  return `repl-${Date.now()}-${commandCounter}`;
}

function addEntry(level: ConsoleLogLevel, value: unknown): string {
  const id = nextEntryId();
  const parts = toConsoleArgs([value]);
  // Forced: a command the user just typed must show up even while capture is paused.
  consoleLogStore.add(
    {
      id,
      level,
      parts,
      text: getConsoleArgsText(parts),
      timestamp: Date.now(),
      count: 1,
      // The prompt runs in the app's context, so it files under the same source as `patchConsole`.
      source: NATIVE_CONSOLE_SOURCE,
    },
    { force: true }
  );
  return id;
}

function isThenable(value: unknown): value is Promise<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}

function settle(id: string, value: unknown) {
  const parts = toConsoleArgs([value]);
  consoleLogStore.update(id, { parts, text: getConsoleArgsText(parts) });
}

/** Echoes the typed source, evaluates it, and writes the answer back as its own row. */
export function runReplCommand(source: string) {
  addEntry('input', source);

  let value: unknown;
  try {
    value = evaluateExpression(source);
  } catch (error) {
    addEntry('result', error);
    return;
  }

  if (!isThenable(value)) {
    addEntry('result', value);
    return;
  }

  // Awaiting is the point for anything network-shaped, so the row lands pending and fills in.
  const id = addEntry('result', 'Promise {<pending>}');
  value.then(
    (resolved) => settle(id, resolved),
    (reason) => settle(id, reason)
  );
}
