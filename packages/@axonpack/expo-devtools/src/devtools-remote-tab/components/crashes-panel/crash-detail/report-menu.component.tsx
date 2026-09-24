import { COPY_ATTRIBUTE } from '@axonpack/react-native-devtools-tab';

import type { CrashRecord } from '../../../../features/crash/stores/crash.store';
import {
  formatCrashJson,
  formatCrashReport,
  formatCrashTitle,
} from '../../../../features/crash/utils/format-crash-report.util';

function fileName(record: CrashRecord, extension: string): string {
  return `crash-${new Date(record.timestamp).toISOString().replace(/[:.]/g, '-')}.${extension}`;
}

function dataUrl(type: string, text: string): string {
  return `data:${type};charset=utf-8,${encodeURIComponent(text)}`;
}

/**
 * The app's ⋮ menu for a report. Every copy carries its text, so the page puts it on this computer's
 * clipboard, and the app's Share becomes two downloads. At most 25 small reports, so the files are
 * built on opening the menu rather than on hover.
 */
export function ReportMenu({ record, onClose }: { record: CrashRecord; onClose: () => void }) {
  const copies = [
    { label: 'Copy message', text: formatCrashTitle(record) },
    ...(record.stack ? [{ label: 'Copy stack', text: record.stack }] : []),
    { label: 'Copy report (Markdown)', text: formatCrashReport(record) },
    { label: 'Copy report (JSON)', text: formatCrashJson(record) },
  ];
  const downloads = [
    {
      label: 'Save report (Markdown)',
      href: dataUrl('text/markdown', formatCrashReport(record)),
      name: fileName(record, 'md'),
    },
    {
      label: 'Save report (JSON)',
      href: dataUrl('application/json', formatCrashJson(record)),
      name: fileName(record, 'json'),
    },
  ];

  return (
    <div className="axonpack-net-context-anchor axonpack-net-row-menu" data-align="right">
      <span className="axonpack-panel-menu-backdrop" onClick={onClose} />
      <span role="menu" className="axonpack-net-context">
        {copies.map((item) => (
          <button
            key={item.label}
            role="menuitem"
            className="axonpack-net-context-item"
            {...{ [COPY_ATTRIBUTE]: item.text }}
            onClick={onClose}>
            {item.label}
          </button>
        ))}
        {downloads.map((item) => (
          <a
            key={item.label}
            role="menuitem"
            className="axonpack-net-context-item"
            href={item.href}
            download={item.name}
            onClick={onClose}>
            {item.label}
          </a>
        ))}
      </span>
    </div>
  );
}
