import { AuthSection } from './auth-section.component';
import { CodeSnippet } from './code-snippet.component';
import { KeyValueTable } from './key-value-table.component';
import { NetworkConditionsSection } from './network-conditions-section.component';
import { formatJson } from '../../../../../core/utils/format-json.util';
import type { KeyValueRow, SandboxDraft } from '../../../../../features/network/utils/sandbox.util';
import { SyncedInput } from '../../synced-input.component';

/** A count that leaves out the blank row every table ends with. */
const filled = (rows: KeyValueRow[]) => rows.filter((row) => row.key || row.value).length;

/**
 * Every part of the request as a section of its own, open, in one column, the way Scalar lays out a
 * request: authentication first, since it is what a request most often gets wrong, then the tables,
 * then the body. The snippet is docked under them, so it stays in view while the rest scrolls.
 *
 * Native `details`, so the page folds them itself and a section stays as it was left.
 */
export function RequestSection({
  draft,
  onEdit,
}: {
  draft: SandboxDraft;
  onEdit: (patch: Partial<SandboxDraft>) => void;
}) {
  const formatted = formatJson(draft.bodyText);
  const noBody = draft.method === 'GET' || draft.method === 'HEAD';

  const table = (title: string, key: 'cookieRows' | 'headerRows' | 'paramRows') => (
    <details open className="axonpack-sbx-section">
      <summary>
        {title}
        {filled(draft[key]) > 0 && <span className="axonpack-sbx-count">{filled(draft[key])}</span>}
      </summary>
      <KeyValueTable rows={draft[key]} onChange={(rows) => onEdit({ [key]: rows })} />
    </details>
  );

  return (
    <section className="axonpack-sbx-pane">
      <div className="axonpack-sbx-pane-head">
        <span className="axonpack-sbx-pane-title">Request</span>
      </div>
      <div className="axonpack-sbx-pane-body">
        <AuthSection auth={draft.auth} onChange={(auth) => onEdit({ auth })} />
        <NetworkConditionsSection />
        {table('Cookies', 'cookieRows')}
        {table('Headers', 'headerRows')}
        {table('Query Parameters', 'paramRows')}
        <details open className="axonpack-sbx-section">
          <summary>Body</summary>
          <div className="axonpack-sbx-body">
            <SyncedInput
              value={draft.bodyText}
              onChange={(bodyText) => onEdit({ bodyText })}
              placeholder={
                noBody ? `A ${draft.method} request is sent without a body` : 'Request body'
              }
              label="Request body"
              multiline
            />
            {/* Only on demand: formatting on every keystroke would move the text under the caret. */}
            {formatted !== draft.bodyText && (
              <div className="axonpack-sbx-actions">
                <button
                  className="axonpack-net-action"
                  onClick={() => onEdit({ bodyText: formatted })}>
                  Format JSON
                </button>
              </div>
            )}
          </div>
        </details>
      </div>
      <CodeSnippet draft={draft} />
    </section>
  );
}
