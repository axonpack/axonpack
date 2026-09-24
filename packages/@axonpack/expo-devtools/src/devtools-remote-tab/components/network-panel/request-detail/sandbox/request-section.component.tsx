import { useState } from 'react';

import { AuthSection } from './auth-section.component';
import { CurlSnippet } from './curl-snippet.component';
import { KeyValueTable } from './key-value-table.component';
import { formatJson } from '../../../../../core/utils/format-json.util';
import type { KeyValueRow, SandboxDraft } from '../../../../../features/network/utils/sandbox.util';
import { SyncedInput } from '../../synced-input.component';

type Section = 'params' | 'headers' | 'cookies' | 'auth' | 'body' | 'code';

/** A count that leaves out the blank row every table ends with. */
const filled = (rows: KeyValueRow[]) => rows.filter((row) => row.key || row.value).length;

/** One section at a time under a tab strip, rather than every section open in one long column. */
export function RequestSection({
  draft,
  onEdit,
}: {
  draft: SandboxDraft;
  onEdit: (patch: Partial<SandboxDraft>) => void;
}) {
  // A request that carried a body is usually opened to change it.
  const [section, setSection] = useState<Section>(() => (draft.bodyText ? 'body' : 'params'));
  const formatted = formatJson(draft.bodyText);

  const tabs: { key: Section; label: string; count?: number }[] = [
    { key: 'params', label: 'Params', count: filled(draft.paramRows) },
    { key: 'headers', label: 'Headers', count: filled(draft.headerRows) },
    { key: 'cookies', label: 'Cookies', count: filled(draft.cookieRows) },
    { key: 'auth', label: 'Auth' },
    { key: 'body', label: 'Body' },
    { key: 'code', label: 'cURL' },
  ];

  return (
    <section className="axonpack-sbx-pane">
      <div className="axonpack-sbx-pane-head">
        <span className="axonpack-sbx-pane-title">Request</span>
        <div className="axonpack-sbx-tabs" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={section === tab.key}
              onClick={() => setSection(tab.key)}>
              {tab.label}
              {tab.count ? <span className="axonpack-sbx-count">{tab.count}</span> : null}
            </button>
          ))}
        </div>
      </div>
      <div className="axonpack-sbx-pane-body">
        {section === 'params' && (
          <KeyValueTable rows={draft.paramRows} onChange={(paramRows) => onEdit({ paramRows })} />
        )}
        {section === 'headers' && (
          <KeyValueTable
            rows={draft.headerRows}
            onChange={(headerRows) => onEdit({ headerRows })}
          />
        )}
        {section === 'cookies' && (
          <KeyValueTable
            rows={draft.cookieRows}
            onChange={(cookieRows) => onEdit({ cookieRows })}
          />
        )}
        {section === 'auth' && (
          <AuthSection auth={draft.auth} onChange={(auth) => onEdit({ auth })} />
        )}
        {section === 'body' && (
          <div className="axonpack-sbx-body">
            <SyncedInput
              value={draft.bodyText}
              onChange={(bodyText) => onEdit({ bodyText })}
              placeholder={
                draft.method === 'GET' || draft.method === 'HEAD'
                  ? `A ${draft.method} request is sent without a body`
                  : 'Request body'
              }
              label="Request body"
              multiline
            />
            <div className="axonpack-sbx-actions">
              {/* Only on demand: formatting on every keystroke would move the text under the caret. */}
              <button
                className="axonpack-net-action"
                disabled={formatted === draft.bodyText}
                onClick={() => onEdit({ bodyText: formatted })}>
                Format JSON
              </button>
            </div>
          </div>
        )}
        {section === 'code' && <CurlSnippet draft={draft} />}
      </div>
    </section>
  );
}
