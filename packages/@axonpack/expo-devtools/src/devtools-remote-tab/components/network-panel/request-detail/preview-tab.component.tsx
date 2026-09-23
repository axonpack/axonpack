import { JsonNode } from './json-node.component';
import type { JsonValue } from '../../../../core/utils/json-tree.util';
import type { NetworkLogEntry } from '../../../../features/network/stores/network-log.store';

function parseJson(body: string): JsonValue | undefined {
  try {
    return JSON.parse(body) as JsonValue;
  } catch {
    return undefined;
  }
}

/** What Chrome would draw for the body: a tree, a picture, a page, or the text. */
export function PreviewTab({ entry }: { entry: NetworkLogEntry }) {
  const mime = entry.mimeType?.toLowerCase() ?? '';

  if (entry.responseBase64 && mime.startsWith('image/')) {
    return (
      <div className="axonpack-net-preview-image">
        <img src={`data:${mime};base64,${entry.responseBase64}`} alt="" />
      </div>
    );
  }
  if (!entry.responseBody) {
    return <p className="axonpack-net-none">No preview available.</p>;
  }
  if (mime.includes('html')) {
    // Sandboxed with nothing allowed: the page is drawn, and its scripts, forms and links do nothing.
    return <iframe className="axonpack-net-preview-page" sandbox="" srcDoc={entry.responseBody} />;
  }

  const json = parseJson(entry.responseBody);
  if (json !== undefined && typeof json === 'object' && json !== null) {
    return (
      <div className="axonpack-json">
        <JsonNode value={json} open />
      </div>
    );
  }
  return <pre className="axonpack-net-code">{entry.responseBody}</pre>;
}
