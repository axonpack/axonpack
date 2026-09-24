import { ConsoleRow } from './console-row.component';
import { CrashRow } from './crash-row.component';
import type { Palette } from '../../../core/constants/theme.const';
import type { Matcher } from '../../../core/utils/text-search.util';
import type { ConsoleLogEntry } from '../../../features/console/stores/console-log.store';

/**
 * The rows, newest first in the DOM, which the reversed box turns into newest at the bottom. That is
 * the store's own order, so nothing is copied or reversed on every log.
 */
export function ConsoleList({
  visible,
  total,
  matcher,
  palette,
}: {
  visible: ConsoleLogEntry[];
  total: number;
  matcher: Matcher | null;
  palette: Palette;
}) {
  return (
    <div className="axonpack-con-main">
      <div className="axonpack-con-list">
        {visible.map((entry) =>
          entry.level === 'crash' ? (
            <CrashRow key={entry.id} entry={entry} palette={palette} />
          ) : (
            <ConsoleRow key={entry.id} entry={entry} matcher={matcher} palette={palette} />
          )
        )}
        {visible.length === 0 && (
          <p className="axonpack-con-empty">
            {total === 0 ? 'No console output captured yet' : 'No messages match your filter'}
          </p>
        )}
      </div>
    </div>
  );
}
