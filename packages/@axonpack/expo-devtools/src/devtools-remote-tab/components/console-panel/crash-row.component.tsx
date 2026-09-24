import { COPY_ATTRIBUTE } from '@axonpack/react-native-devtools-tab';
import { memo } from 'react';

import { CallSite } from './call-site.component';
import { CRASH_KIND_ICONS, LEVEL_ICONS } from '../../constants/console-icons.const';
import { axonpackTabStore } from '../../stores/axonpack-tab.store';
import { rowStyle } from './row-style.util';
import type { Palette } from '../../../core/constants/theme.const';
import type { ConsoleLogEntry } from '../../../features/console/stores/console-log.store';
import { resolveRowVisual } from '../../../features/console/utils/row-visual.util';
import { CRASH_KIND_LABELS } from '../../../features/crash/utils/format-crash-report.util';

/**
 * A crash as a card, the way the app draws it: glyph, name over message, badges with the time at
 * the end. Open report switches to the Crashes panel with this report open there, rather than
 * over the Console as the app does, since a tab has no sheet to raise.
 *
 * The whole card opens it, as the app's does, except Copy. A click cannot be kept from bubbling
 * across the wire, so a handler on the card would open the report on every copy too. Each part
 * carries the handler instead.
 */
function CrashRowBase({ entry, palette }: { entry: ConsoleLogEntry; palette: Palette }) {
  const icon = entry.crashKind ? CRASH_KIND_ICONS[entry.crashKind] : LEVEL_ICONS.crash;
  const crashId = entry.crashId;
  const open = crashId === undefined ? undefined : () => axonpackTabStore.openCrash(crashId);

  return (
    <div
      className="axonpack-con-card"
      data-open={open ? true : undefined}
      style={rowStyle(resolveRowVisual(entry, palette))}>
      <span className="axonpack-con-glyph" data-con-icon={icon ?? undefined} onClick={open} />
      <div className="axonpack-con-body">
        <div className="axonpack-con-card-title">
          <span className="axonpack-con-card-name" onClick={open}>
            {entry.crashName ?? 'Crash'}
          </span>
          {entry.count > 1 && <span className="axonpack-con-meta">×{entry.count}</span>}
          <span className="axonpack-con-meta">
            <button
              className="axonpack-net-button"
              data-icon="copy"
              title="Copy"
              {...{ [COPY_ATTRIBUTE]: entry.text }}
            />
          </span>
        </div>
        <div className="axonpack-con-card-message" onClick={open}>
          {entry.crashMessage || '(no message)'}
        </div>
        <div className="axonpack-con-badges" onClick={open}>
          {entry.crashKind && (
            <span className="axonpack-con-badge">{CRASH_KIND_LABELS[entry.crashKind]}</span>
          )}
          {entry.crashFromPreviousLaunch && (
            <span className="axonpack-con-badge" data-con-icon="history">
              Previous launch
            </span>
          )}
          {entry.crashBreadcrumbs ? (
            <span className="axonpack-con-badge" title="Breadcrumbs">
              {entry.crashBreadcrumbs} breadcrumbs
            </span>
          ) : null}
          {entry.callSite?.length ? <CallSite id={entry.id} frames={entry.callSite} /> : null}
          <time>{new Date(entry.timestamp).toLocaleTimeString()}</time>
        </div>
        {open && (
          <button className="axonpack-con-open" onClick={open}>
            Open report
          </button>
        )}
      </div>
    </div>
  );
}

export const CrashRow = memo(CrashRowBase);
