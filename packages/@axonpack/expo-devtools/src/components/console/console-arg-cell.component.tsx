import { ErrorArgCell } from './error-arg-cell.component';
import { TextArgCell } from './text-arg-cell.component';
import type { ConsoleArg } from '../../utils/console/format-console-args.util';
import { JsonTree } from '../json-tree';

/** One `console.*` argument, on its own line. Objects get the inspectable tree the Network tab uses. */
export function ConsoleArgCell({
  arg,
  plainColor,
  selectable,
}: {
  arg: ConsoleArg;
  plainColor?: string;
  /** Off for a recallable row — a `selectable` Text swallows the tap that replays it. */
  selectable?: boolean;
}) {
  if (arg.kind === 'error') return <ErrorArgCell text={arg.text} stack={arg.stack} />;

  // Collapsed to its one-line `{…}` preview, so a multi-argument row stays scannable until you open
  // the one you care about. The type name rides on that root line (`Map(2): {…}`), not a caption.
  if (arg.kind === 'json') {
    return <JsonTree value={arg.value} rootLabel={arg.label} defaultExpanded={false} />;
  }

  return (
    <TextArgCell text={arg.text} tone={arg.tone} plainColor={plainColor} selectable={selectable} />
  );
}
