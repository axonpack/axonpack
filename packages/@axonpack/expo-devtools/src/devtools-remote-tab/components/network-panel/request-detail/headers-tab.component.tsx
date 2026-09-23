import type { NetworkEntry } from '../../../../features/network/stores/network-log.store';
import {
  formatSource,
  formatStatus,
  isErrorStatus,
} from '../../../../features/network/utils/formatters.util';
import { describeResponseSizes } from '../../../../features/network/utils/response-size.util';

/** A row, and for Status Code the app's coloured dot (`data-tone` in the CSS). */
type Row = [key: string, value: string, tone?: 'success' | 'pending' | 'error'];

function statusTone(entry: NetworkEntry): Row[2] {
  if (entry.kind === 'websocket') return undefined;
  if (entry.status === 'pending') return 'pending';
  return isErrorStatus(entry.status, entry.statusCode) ? 'error' : 'success';
}

function general(entry: NetworkEntry): Row[] {
  const rows: Row[] = [
    ['Request URL', entry.url],
    ['Request Method', entry.kind === 'websocket' ? 'GET' : entry.method],
  ];
  if (entry.kind === 'websocket') {
    const closed =
      entry.closeCode === undefined
        ? ''
        : ` (${entry.closeCode}${entry.closeReason ? `, ${entry.closeReason}` : ''})`;
    rows.push(['Status', `${entry.status}${closed}`]);
    if (entry.protocols?.length) rows.push(['Protocols', entry.protocols.join(', ')]);
    if (entry.error) rows.push(['Error', entry.error]);
  } else {
    rows.push(['Status Code', formatStatus(entry), statusTone(entry)]);
    rows.push(['Size', describeResponseSizes(entry)]);
  }
  if (entry.source) rows.push(['Source', formatSource(entry.source)]);
  return rows;
}

/**
 * Chrome's sections, open to start with. Native `details`, so the page folds them itself and a
 * section stays as it was left while the request updates.
 */
function section(title: string, rows: Row[] | undefined) {
  return (
    <details key={title} open className="axonpack-net-section">
      <summary>
        {title}
        {rows && title !== 'General' && <span className="axonpack-net-count">({rows.length})</span>}
      </summary>
      {rows?.length ? (
        <div className="axonpack-net-kv">
          {rows.map(([key, value, tone], index) => (
            <div key={`${index}-${key}`}>
              <span>{key}</span>
              <span>
                {tone && <span className="axonpack-net-dot" data-tone={tone} />}
                {value}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="axonpack-net-none">No headers captured</p>
      )}
    </details>
  );
}

export function HeadersTab({ entry }: { entry: NetworkEntry }) {
  const headers = (record: Record<string, string> | undefined) =>
    record ? Object.entries(record) : [];

  return (
    <div>
      {section('General', general(entry))}
      {entry.kind === 'http' && (
        <>
          {section('Response Headers', headers(entry.responseHeaders))}
          {section('Request Headers', headers(entry.requestHeaders))}
        </>
      )}
    </div>
  );
}
