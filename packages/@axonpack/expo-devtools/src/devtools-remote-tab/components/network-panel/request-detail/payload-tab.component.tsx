import { useState } from 'react';

import { JsonTree } from './json-tree.component';
import { formatSize } from '../../../../core/utils/format-bytes.util';
import { formatJson } from '../../../../core/utils/format-json.util';
import type { JsonValue } from '../../../../core/utils/json-tree.util';
import type {
  NetworkEntry,
  NetworkLogEntry,
} from '../../../../features/network/stores/network-log.store';

function queryParams(url: string): [string, string][] {
  try {
    return [...new URL(url).searchParams.entries()];
  } catch {
    return [];
  }
}

/** A body that is a JSON object or array, which is what the app draws as a tree. */
function parseObject(body: string): JsonValue | undefined {
  try {
    const value = JSON.parse(body) as JsonValue;
    return typeof value === 'object' && value !== null ? value : undefined;
  } catch {
    return undefined;
  }
}

export function hasPayload(entry: NetworkEntry): boolean {
  return (
    entry.kind === 'http' &&
    (Boolean(entry.requestBody) ||
      Boolean(entry.requestFields?.length) ||
      queryParams(entry.url).length > 0)
  );
}

/** Chrome's order: the query string, then what went in the body. */
export function PayloadTab({ entry }: { entry: NetworkLogEntry }) {
  const query = queryParams(entry.url);
  const [viewSource, setViewSource] = useState(false);
  const parsed = entry.requestBody ? parseObject(entry.requestBody) : undefined;
  const showSource = viewSource || parsed === undefined;

  return (
    <div>
      {query.length > 0 && (
        <details open className="axonpack-net-section">
          <summary>
            Query String Parameters<span className="axonpack-net-count">({query.length})</span>
          </summary>
          <div className="axonpack-net-kv">
            {query.map(([key, value], index) => (
              <div key={`${index}-${key}`}>
                <span>{key}</span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </details>
      )}
      {entry.requestFields?.length ? (
        // An upload's parts are the payload, and one line of them loses which file went up.
        <details open className="axonpack-net-section">
          <summary>Form Data</summary>
          <div className="axonpack-net-kv">
            {entry.requestFields.map((field, index) => (
              <div key={`${index}-${field.name}`}>
                <span>{field.name}</span>
                <span>
                  {field.kind === 'text'
                    ? field.value
                    : [
                        field.fileName ?? '(unnamed file)',
                        field.contentType,
                        field.size !== undefined ? formatSize(field.size) : undefined,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                </span>
              </div>
            ))}
          </div>
        </details>
      ) : (
        entry.requestBody && (
          <details open className="axonpack-net-section">
            <summary>Request Payload</summary>
            {parsed !== undefined && (
              // Under the header rather than in it: a click anywhere in a summary also folds it.
              <div className="axonpack-net-section-tools">
                <button onClick={() => setViewSource((current) => !current)}>
                  {showSource ? 'View parsed' : 'View source'}
                </button>
              </div>
            )}
            {showSource ? (
              <pre className="axonpack-net-code">{formatJson(entry.requestBody)}</pre>
            ) : (
              <JsonTree value={parsed as JsonValue} />
            )}
          </details>
        )
      )}
    </div>
  );
}
