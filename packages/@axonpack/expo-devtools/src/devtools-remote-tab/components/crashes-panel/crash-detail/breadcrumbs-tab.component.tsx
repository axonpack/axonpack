import type { CSSProperties } from 'react';

import type { Palette } from '../../../../core/constants/theme.const';
import type { CrashBreadcrumb, CrashRecord } from '../../../../features/crash/stores/crash.store';
import { formatCrashTime } from '../../../../features/crash/utils/format-crash-report.util';

function crumbColor(crumb: CrashBreadcrumb, palette: Palette): string {
  if (crumb.level === 'error') return palette.error;
  if (crumb.level === 'warn') return palette.warning;
  return palette.textSecondary;
}

export function BreadcrumbsTab({ record, palette }: { record: CrashRecord; palette: Palette }) {
  const crumbs = record.breadcrumbs ?? [];

  if (crumbs.length === 0) {
    return (
      <>
        <p className="axonpack-net-none">No breadcrumbs were recorded</p>
        <p className="axonpack-crash-note">
          Breadcrumbs replay the console and network entries leading up to the crash. They are off
          by default outside development, because that trail carries request URLs and whatever the
          app logged. Turn them on with {'`crash: { breadcrumbs: true }`'}.
        </p>
      </>
    );
  }

  return (
    <div>
      {crumbs.map((crumb, index) => (
        <div
          key={`${crumb.at}-${index}`}
          className="axonpack-crash-crumb"
          data-con-icon={crumb.category === 'network' ? 'arrow-down' : 'terminal'}
          style={{ '--row-color': crumbColor(crumb, palette) } as CSSProperties}>
          <time>{formatCrashTime(crumb.at).slice(11)}</time>
          <span>{crumb.message}</span>
        </div>
      ))}
    </div>
  );
}
