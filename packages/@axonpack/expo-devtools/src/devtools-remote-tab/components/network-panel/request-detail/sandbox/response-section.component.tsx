import { useState } from 'react';

import { formatSize } from '../../../../../core/utils/format-bytes.util';
import { formatDuration } from '../../../../../core/utils/format-duration.util';
import { formatJson } from '../../../../../core/utils/format-json.util';
import { utf8ByteLength } from '../../../../../features/network/utils/response-size.util';
import type { SandboxResult } from '../../../../../features/network/utils/sandbox.util';

/** What came back: the status, time and size in the head, then its body or its headers. */
export function ResponseSection({
  sending,
  result,
}: {
  sending: boolean;
  result: SandboxResult | null;
}) {
  const [section, setSection] = useState<'body' | 'headers'>('body');
  const headers = result?.ok ? Object.entries(result.headers) : [];

  return (
    <section className="axonpack-sbx-pane">
      <div className="axonpack-sbx-pane-head">
        <span className="axonpack-sbx-pane-title">Response</span>
        {result?.ok && (
          <div className="axonpack-sbx-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={section === 'body'}
              onClick={() => setSection('body')}>
              Body
            </button>
            <button
              role="tab"
              aria-selected={section === 'headers'}
              onClick={() => setSection('headers')}>
              Headers
              {headers.length > 0 && <span className="axonpack-sbx-count">{headers.length}</span>}
            </button>
          </div>
        )}
        {result && !sending && (
          <span className="axonpack-sbx-meta">
            <span
              className="axonpack-sbx-status"
              data-tone={result.ok && result.status < 400 ? 'success' : 'error'}>
              {result.ok ? `${result.status} ${result.statusText}`.trim() : 'Failed'}
            </span>
            <span>{formatDuration(result.duration)}</span>
            {result.ok && <span>{formatSize(utf8ByteLength(result.body))}</span>}
          </span>
        )}
      </div>
      <div className="axonpack-sbx-pane-body">
        {sending ? (
          <p className="axonpack-sbx-empty">Sending from the device…</p>
        ) : !result ? (
          <p className="axonpack-sbx-empty">
            Send the request to see its response here. It goes out from the device, and shows up in
            the log as well.
          </p>
        ) : !result.ok ? (
          <pre className="axonpack-net-code axonpack-sbx-code" data-tone="error">
            {result.error}
          </pre>
        ) : section === 'headers' ? (
          <div className="axonpack-sbx-form">
            {headers.map(([key, value]) => (
              <span key={key} className="axonpack-sbx-header">
                <span>{key}</span>
                <span>{value}</span>
              </span>
            ))}
          </div>
        ) : result.body ? (
          <pre className="axonpack-net-code axonpack-sbx-code">
            {result.headers['content-type']?.includes('json')
              ? formatJson(result.body)
              : result.body}
          </pre>
        ) : (
          <p className="axonpack-sbx-empty">The response has no body.</p>
        )}
      </div>
    </section>
  );
}
