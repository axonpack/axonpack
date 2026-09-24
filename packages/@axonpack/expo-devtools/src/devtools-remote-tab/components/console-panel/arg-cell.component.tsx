import { ErrorArg } from './error-arg.component';
import { TextArg } from './text-arg.component';
import type { Palette } from '../../../core/constants/theme.const';
import type { Matcher } from '../../../core/utils/text-search.util';
import type { ConsoleArg } from '../../../features/console/utils/format-console-args.util';
import { JsonTree } from '../network-panel/request-detail/json-tree.component';

/** One logged argument, drawn by what it is. Collapsed trees, like the app's. */
export function ArgCell({
  arg,
  palette,
  plainColor,
  matcher,
  onOpenReport,
}: {
  arg: ConsoleArg;
  palette: Palette;
  plainColor?: string;
  matcher: Matcher | null;
  onOpenReport?: () => void;
}) {
  if (arg.kind === 'error') {
    return <ErrorArg text={arg.text} stack={arg.stack} onOpenReport={onOpenReport} />;
  }

  if (arg.kind === 'json') {
    return (
      <JsonTree value={arg.value} rootLabel={arg.label} defaultExpanded={false} matcher={matcher} />
    );
  }

  return (
    <TextArg
      text={arg.text}
      tone={arg.tone}
      palette={palette}
      plainColor={plainColor}
      matcher={matcher}
    />
  );
}
