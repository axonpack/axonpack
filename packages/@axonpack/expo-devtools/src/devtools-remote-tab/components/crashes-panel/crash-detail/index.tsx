import { COPY_ATTRIBUTE } from '@axonpack/react-native-devtools-tab';
import { useState } from 'react';

import { BreadcrumbsTab } from './breadcrumbs-tab.component';
import { ReportMenu } from './report-menu.component';
import { SummaryTab } from './summary-tab.component';
import type { Palette } from '../../../../core/constants/theme.const';
import type { CrashRecord } from '../../../../features/crash/stores/crash.store';
import { formatCrashTitle } from '../../../../features/crash/utils/format-crash-report.util';

type Tab = 'summary' | 'breadcrumbs';

const TABS: { key: Tab; label: string }[] = [
  { key: 'summary', label: 'Summary' },
  { key: 'breadcrumbs', label: 'Breadcrumbs' },
];

/**
 * The app's report sheet as the Network panel's side pane: close, the two tabs, and ⋮ at the end.
 * The picked tab stays picked from one report to the next, as a request's does.
 */
export function CrashDetail({
  record,
  palette,
  onClose,
}: {
  record: CrashRecord;
  palette: Palette;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('summary');
  const [menuOpen, setMenuOpen] = useState(false);
  const title = formatCrashTitle(record);

  return (
    <div className="axonpack-net-detail">
      <div className="axonpack-net-detail-bar" role="tablist">
        <button
          className="axonpack-net-button axonpack-net-detail-close"
          data-icon="cross"
          title="Close"
          aria-label="Close"
          onClick={onClose}
        />
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={key === tab}
            className="axonpack-net-detail-tab"
            onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
        <span className="axonpack-net-detail-more">
          <button
            className="axonpack-net-button"
            title="More"
            aria-label="More"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}>
            <span className="axonpack-material" data-material="more-vert" />
          </button>
          {menuOpen && <ReportMenu record={record} onClose={() => setMenuOpen(false)} />}
        </span>
      </div>
      <div className="axonpack-net-detail-body">
        <div className="axonpack-crash-title">
          <span>{title}</span>
          <button
            className="axonpack-net-button"
            data-icon="copy"
            title="Copy"
            {...{ [COPY_ATTRIBUTE]: title }}
          />
        </div>
        {tab === 'summary' ? (
          <SummaryTab record={record} palette={palette} />
        ) : (
          <BreadcrumbsTab record={record} palette={palette} />
        )}
      </div>
    </div>
  );
}
