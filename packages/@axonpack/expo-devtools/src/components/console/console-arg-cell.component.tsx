import { ErrorArgCell } from './error-arg-cell.component';
import { TextArgCell } from './text-arg-cell.component';
import type { ConsoleArg } from '../../utils/console/format-console-args.util';
import { JsonTree } from '../json-tree';

/** One `console.*` argument. Objects and arrays get the same inspectable tree the Network tab uses. */
export function ConsoleArgCell({ arg, plainColor }: { arg: ConsoleArg; plainColor?: string }) {
  if (arg.kind === 'error') return <ErrorArgCell text={arg.text} stack={arg.stack} />;

  // The type name rides on the tree's own root line (`Map(2): {…}`) rather than a caption above it —
  // the tree's indentation already separates one argument from the next, so it needs no box.
  if (arg.kind === 'json') return <JsonTree value={arg.value} rootLabel={arg.label} />;

  return <TextArgCell text={arg.text} tone={arg.tone} plainColor={plainColor} />;
}
