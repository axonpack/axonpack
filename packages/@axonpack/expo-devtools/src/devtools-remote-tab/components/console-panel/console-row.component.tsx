import { COPY_ATTRIBUTE } from '@axonpack/react-native-devtools-tab';
import { memo } from 'react';

import { ArgCell } from './arg-cell.component';
import { CallSite } from './call-site.component';
import { CRASH_KIND_ICONS, LEVEL_ICONS } from '../../constants/console-icons.const';
import { rowStyle } from './row-style.util';
import type { Palette } from '../../../core/constants/theme.const';
import type { Matcher } from '../../../core/utils/text-search.util';
import type { ConsoleLogEntry } from '../../../features/console/stores/console-log.store';
import { consolePromptStore } from '../../../features/console/stores/console-prompt.store';
import {
  formatConsoleSource,
  NATIVE_CONSOLE_SOURCE,
} from '../../../features/console/utils/formatters.util';
import { resolveRowVisual } from '../../../features/console/utils/row-visual.util';
import { axonpackTabStore } from '../../stores/axonpack-tab.store';

/**
 * One line of output, laid out as the app's row is: glyph, one cell per argument, then where it came
 * from, how often, when, and Copy. An input row puts its command back in the prompt on a click; the
 * click is on the body only, since a handler here cannot stop Copy's click from reaching it.
 */
function ConsoleRowBase({
  entry,
  matcher,
  palette,
}: {
  entry: ConsoleLogEntry;
  matcher: Matcher | null;
  palette: Palette;
}) {
  const icon = entry.crashKind ? CRASH_KIND_ICONS[entry.crashKind] : LEVEL_ICONS[entry.level];
  const recallable = entry.level === 'input';
  const crashId = entry.crashId;

  return (
    <div className="axonpack-con-row" style={rowStyle(resolveRowVisual(entry, palette))}>
      <span className="axonpack-con-glyph" data-con-icon={icon ?? undefined} />
      <div
        className="axonpack-con-body"
        data-recall={recallable || undefined}
        title={recallable ? 'Put back in the prompt' : undefined}
        onClick={recallable ? () => consolePromptStore.recall(entry.text) : undefined}>
        {entry.parts.map((arg, index) => (
          <ArgCell
            key={index}
            arg={arg}
            palette={palette}
            plainColor={entry.level === 'error' ? palette.error : undefined}
            matcher={matcher}
            onOpenReport={
              crashId === undefined ? undefined : () => axonpackTabStore.openCrash(crashId)
            }
          />
        ))}
      </div>
      <div className="axonpack-con-meta">
        {entry.callSite?.length ? <CallSite id={entry.id} frames={entry.callSite} /> : null}
        {entry.source && entry.source !== NATIVE_CONSOLE_SOURCE && (
          <span>{formatConsoleSource(entry.source)}</span>
        )}
        {entry.count > 1 && <span>×{entry.count}</span>}
        <time>{new Date(entry.timestamp).toLocaleTimeString()}</time>
        <button
          className="axonpack-net-button"
          data-icon="copy"
          title="Copy"
          {...{ [COPY_ATTRIBUTE]: entry.text }}
        />
      </div>
    </div>
  );
}

// The store replaces an entry's object whenever it changes, so identity is the whole comparison.
export const ConsoleRow = memo(ConsoleRowBase);
