import { ErrorArgCell } from './error-arg-cell.component';
import { TextArgCell } from './text-arg-cell.component';
import { JsonTree } from '../../../core/components/json-tree';
import type { Matcher } from '../../../core/utils/text-search.util';
import type { ConsoleArg } from '../utils/format-console-args.util';

export function ConsoleArgCell({
  arg,
  plainColor,
  selectable,
  matcher = null,
}: {
  arg: ConsoleArg;
  plainColor?: string;

  selectable?: boolean;
  matcher?: Matcher | null;
}) {
  if (arg.kind === 'error') return <ErrorArgCell text={arg.text} stack={arg.stack} />;

  if (arg.kind === 'json') {
    return (
      <JsonTree value={arg.value} rootLabel={arg.label} defaultExpanded={false} matcher={matcher} />
    );
  }

  return (
    <TextArgCell
      text={arg.text}
      tone={arg.tone}
      plainColor={plainColor}
      selectable={selectable}
      matcher={matcher}
    />
  );
}
