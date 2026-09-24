import { formatSize } from '../../../../core/utils/format-bytes.util';
import { hexDump } from '../../../../core/utils/hex-dump.util';
import type { NetworkLogEntry } from '../../../../features/network/stores/network-log.store';

/** The body as it came, the way Chrome's Response tab shows it. Laying it out is Preview's job. */
export function ResponseTab({ entry }: { entry: NetworkLogEntry }) {
  if (entry.responseBase64) {
    const { rows, hiddenBytes } = hexDump(entry.responseBase64);
    return (
      <>
        {/* One text node for the whole dump, so it crosses as one op however many rows it has. */}
        <pre className="axonpack-net-code axonpack-net-hex">
          {rows.map((row) => `${row.offset}  ${row.bytes}  ${row.ascii}`).join('\n')}
        </pre>
        {hiddenBytes > 0 && (
          <p className="axonpack-net-none">{`… ${hiddenBytes} more bytes not shown`}</p>
        )}
      </>
    );
  }
  if (entry.bodyOmitted) {
    return (
      <p className="axonpack-net-none">
        {entry.bodyOmitted === 'too-large'
          ? `The body was too large to keep${entry.size !== undefined ? ` (${formatSize(entry.size)})` : ''}, so its bytes were not stored.`
          : 'The body could not be read.'}
      </p>
    );
  }
  if (!entry.responseBody) {
    return (
      <p className="axonpack-net-none">
        {entry.status === 'pending'
          ? 'The response has not arrived yet.'
          : 'This request has no response data.'}
      </p>
    );
  }
  return <pre className="axonpack-net-code">{entry.responseBody}</pre>;
}
