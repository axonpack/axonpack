import { formatSize } from '../../../../core/utils/format-bytes.util';
import type { NetworkLogEntry } from '../../../../features/network/stores/network-log.store';

/** The body as it came, the way Chrome's Response tab shows it. Laying it out is Preview's job. */
export function ResponseTab({ entry }: { entry: NetworkLogEntry }) {
  if (entry.responseBase64) {
    return (
      <p className="axonpack-net-none">
        This response is binary{entry.size !== undefined ? ` (${formatSize(entry.size)})` : ''}.
      </p>
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
