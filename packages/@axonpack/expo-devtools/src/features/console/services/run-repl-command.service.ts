import { evaluateExpression } from './evaluate-expression.service';
import { consoleLogStore } from '../stores/console-log.store';
import type { ConsoleLogLevel } from '../stores/console-log.store';
import { getConsoleArgsText, toConsoleArgs } from '../utils/format-console-args.util';
import { NATIVE_CONSOLE_SOURCE } from '../utils/formatters.util';
import { normalizeExpressionInput } from '../utils/normalize-expression.util';

let commandCounter = 0;

function nextEntryId(): string {
  commandCounter += 1;
  return `repl-${Date.now()}-${commandCounter}`;
}

function addEntry(level: ConsoleLogLevel, value: unknown): string {
  const id = nextEntryId();
  const parts = toConsoleArgs([value]);
  consoleLogStore.add(
    {
      id,
      level,
      parts,
      text: getConsoleArgsText(parts),
      timestamp: Date.now(),
      count: 1,
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

export function runReplCommand(rawSource: string) {
  const source = normalizeExpressionInput(rawSource).trim();
  if (source.length === 0) return;

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

  const id = addEntry('result', 'Promise {<pending>}');
  value.then(
    (resolved) => settle(id, resolved),
    (reason) => settle(id, reason)
  );
}
