import { memo, type CSSProperties } from 'react';

import type { Palette } from '../../../core/constants/theme.const';
import { getCrashKindVisual } from '../../../features/crash/constants/crash-kind-visuals.const';
import type { CrashRecord } from '../../../features/crash/stores/crash.store';
import {
  CRASH_KIND_LABELS,
  formatCrashTime,
} from '../../../features/crash/utils/format-crash-report.util';
import { CRASH_KIND_ICONS } from '../../constants/console-icons.const';

/** The app's crash row: glyph, name over message, badges with the time at the end, an unread dot. */
function CrashRowBase({
  record,
  selected,
  palette,
  onSelect,
}: {
  record: CrashRecord;
  selected: boolean;
  palette: Palette;
  onSelect: (id: string) => void;
}) {
  const style = { '--row-color': getCrashKindVisual(record.kind, palette).color } as CSSProperties;

  return (
    <button
      className="axonpack-crash-row"
      role="option"
      aria-selected={selected}
      style={style}
      onClick={() => onSelect(record.id)}>
      <span className="axonpack-crash-glyph" data-con-icon={CRASH_KIND_ICONS[record.kind]} />
      <span className="axonpack-crash-body">
        <span className="axonpack-crash-name">{record.name}</span>
        <span className="axonpack-crash-message">{record.message || '(no message)'}</span>
        <span className="axonpack-crash-badges">
          <span className="axonpack-crash-badge">{CRASH_KIND_LABELS[record.kind]}</span>
          {record.fromPreviousLaunch && (
            <span className="axonpack-crash-badge" data-con-icon="history">
              Previous launch
            </span>
          )}
          {record.breadcrumbs?.length ? (
            <span className="axonpack-crash-badge" title="Breadcrumbs">
              {record.breadcrumbs.length} breadcrumbs
            </span>
          ) : null}
          <time>{formatCrashTime(record.timestamp).slice(11)}</time>
        </span>
      </span>
      {!record.seen && <span className="axonpack-crash-unread" title="Unread" />}
    </button>
  );
}

export const CrashRow = memo(CrashRowBase);
