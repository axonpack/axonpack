import { ResponseBody } from './response-body.component';
import { formatSize } from '../../../../../core/utils/format-bytes.util';
import { formatDuration } from '../../../../../core/utils/format-duration.util';
import { responseCookies } from '../../../../../features/network/utils/cookies.util';
import { utf8ByteLength } from '../../../../../features/network/utils/response-size.util';
import type { SandboxResult } from '../../../../../features/network/utils/sandbox.util';
import { responseFileName } from '../../../../../features/network/utils/share-response-body.util';

/** A folded list of names and values, which is what headers and cookies both are here. */
function pairs(title: string, rows: [string, string][]) {
  return (
    <details className="axonpack-sbx-section">
      <summary>
        {title}
        {rows.length > 0 && <span className="axonpack-sbx-count">{rows.length}</span>}
      </summary>
      {rows.length ? (
        <div className="axonpack-sbx-form">
          {rows.map(([key, value], index) => (
            <span key={`${index}-${key}`} className="axonpack-sbx-header">
              <span>{key}</span>
              <span>{value}</span>
            </span>
          ))}
        </div>
      ) : (
        <p className="axonpack-sbx-note">None</p>
      )}
    </details>
  );
}

/**
 * What came back, laid out as Scalar lays it out: time, size and status in the head, then the
 * cookies, the headers that went and the ones that came folded away, and the body open.
 */
export function ResponseSection({
  sending,
  result,
  sentHeaders,
}: {
  sending: boolean;
  result: SandboxResult | null;
  /** The headers the request actually went with, auth and cookies included. */
  sentHeaders: Record<string, string>;
}) {
  const ok = result?.ok ? result : null;
  const contentType = ok?.headers['content-type']?.split(';')[0]?.trim();

  return (
    <section className="axonpack-sbx-pane">
      <div className="axonpack-sbx-pane-head">
        {result && !sending ? (
          <span className="axonpack-sbx-meta">
            <span>{formatDuration(result.duration)}</span>
            {ok && <span>{formatSize(utf8ByteLength(ok.body))}</span>}
            <span
              className="axonpack-sbx-status"
              data-tone={ok && ok.status < 400 ? 'success' : 'error'}>
              {ok ? `${ok.status} ${ok.statusText}`.trim() : 'Failed'}
            </span>
          </span>
        ) : (
          <span className="axonpack-sbx-pane-title">Response</span>
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
        ) : !ok ? (
          <pre className="axonpack-net-code axonpack-sbx-code" data-tone="error">
            {result.ok ? '' : result.error}
          </pre>
        ) : (
          <>
            {pairs(
              'Cookies',
              responseCookies(ok.headers).map((cookie) => [cookie.name, cookie.value])
            )}
            {pairs('Request Headers', Object.entries(sentHeaders))}
            {pairs('Response Headers', Object.entries(ok.headers))}
            <details open className="axonpack-sbx-section">
              <summary>
                Body
                {ok.body && (
                  <span className="axonpack-sbx-summary-end">
                    {/* A real link, so the browser saves it to this computer, as Export does. */}
                    <a
                      className="axonpack-sbx-download"
                      data-icon="download"
                      href={`data:${contentType ?? 'text/plain'};charset=utf-8,${encodeURIComponent(ok.body)}`}
                      download={responseFileName({ url: ok.url, mimeType: contentType })}>
                      Download
                    </a>
                  </span>
                )}
              </summary>
              {ok.body ? (
                <ResponseBody body={ok.body} contentType={contentType} />
              ) : (
                <p className="axonpack-sbx-note">The response has no body.</p>
              )}
            </details>
          </>
        )}
      </div>
    </section>
  );
}
