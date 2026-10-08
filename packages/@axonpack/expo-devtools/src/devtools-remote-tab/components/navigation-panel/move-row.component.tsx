import { memo } from 'react';

import type { Palette } from '../../../core/constants/theme.const';
import { formatDuration } from '../../../core/utils/format-duration.util';
import { findMatches, type Matcher } from '../../../core/utils/text-search.util';
import { actionVisual } from '../../../features/navigation/constants/action-visuals.const';
import type { NavigationMove } from '../../../features/navigation/stores/navigation.store';
import {
  formatActionLabel,
  formatClockTime,
  formatParamsPreview,
  formatRouteName,
} from '../../../features/navigation/utils/format-navigation.util';
import { CallSite } from '../console-panel/call-site.component';
import { HighlightedText } from '../console-panel/highlighted-text.component';

/** One move: when, which action, from where to where with the params, how long it stayed, and who asked. */
function MoveRowBase({
  move,
  stayed,
  matcher,
  palette,
  showContainer,
  selected,
  onSelect,
}: {
  move: NavigationMove;
  /** How long the screen this move landed on stayed on top; `null` while it still is. */
  stayed: number | null;
  matcher: Matcher | null;
  palette: Palette;
  /** Worth the space only once there is more than one container. */
  showContainer: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const from = formatRouteName(move.from);
  const to = formatRouteName(move.to);
  const params = formatParamsPreview(move.to?.params);
  const color = selected ? undefined : actionVisual(move.action, palette).color;

  return (
    <div
      className="axonpack-net-row"
      data-selected={selected || undefined}
      data-noop={move.noop || undefined}
      onClick={() => onSelect(move.id)}>
      <span>{formatClockTime(move.timestamp)}</span>
      <span title={move.action}>
        <span className="axonpack-nav-action" style={{ color }}>
          {formatActionLabel(move.action)}
        </span>
        {showContainer && <span className="axonpack-nav-badge">{move.container}</span>}
      </span>
      <span title={from}>
        {move.from ? <HighlightedText text={from} ranges={findMatches(from, matcher)} /> : ''}
      </span>
      <span title={[to, move.to?.path, params].filter(Boolean).join('  ')}>
        <HighlightedText text={to} ranges={findMatches(to, matcher)} />
        {move.to?.path && <span className="axonpack-nav-muted"> {move.to.path}</span>}
        {params && (
          <span className="axonpack-nav-muted">
            {' '}
            <HighlightedText text={params} ranges={findMatches(params, matcher)} />
          </span>
        )}
      </span>
      <span data-live={(stayed === null && !move.noop) || undefined}>
        {move.noop ? 'no change' : stayed === null ? 'on screen' : formatDuration(stayed)}
      </span>
      <span>{move.origin?.length ? <CallSite id={move.id} frames={move.origin} /> : ''}</span>
    </div>
  );
}

/** A move is never replaced once stored, so this skips every row but a new one. */
export const MoveRow = memo(MoveRowBase);
