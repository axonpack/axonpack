import { ErrorArgCell } from './error-arg-cell.component';
import { TextArgCell } from './text-arg-cell.component';
import type { ConsoleArg } from '../../utils/console/format-console-args.util';
import { JsonTree } from '../json-tree';

export function ConsoleArgCell({
  arg,
  plainColor,
  selectable,
}: {
  arg: ConsoleArg;
  plainColor?: string;

  selectable?: boolean;
}) {
  if (arg.kind === 'error') return <ErrorArgCell text={arg.text} stack={arg.stack} />;

  if (arg.kind === 'json') {
    return <JsonTree value={arg.value} rootLabel={arg.label} defaultExpanded={false} />;
  }

  return (
    <TextArgCell text={arg.text} tone={arg.tone} plainColor={plainColor} selectable={selectable} />
  );
}
