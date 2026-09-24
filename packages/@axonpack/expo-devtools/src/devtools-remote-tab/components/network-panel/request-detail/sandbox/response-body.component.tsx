import { COPY_ATTRIBUTE } from '@axonpack/react-native-devtools-tab';
import { useState } from 'react';

import { formatJson } from '../../../../../core/utils/format-json.util';
import { parseJsonValue } from '../../../../../core/utils/json-tree.util';
import { JsonTree } from '../json-tree.component';

/**
 * Scalar's body view: the content type and a Preview or Raw switch over it, then the body. Preview
 * is the same JSON tree as the Preview tab; Raw is the text with its line numbers.
 */
export function ResponseBody({ body, contentType }: { body: string; contentType?: string }) {
  const json = parseJsonValue(body);
  const [mode, setMode] = useState<'preview' | 'raw'>('preview');
  const raw = json === undefined ? body : formatJson(body);
  const showing = json === undefined ? 'raw' : mode;

  return (
    <div className="axonpack-sbx-response-body">
      <div className="axonpack-sbx-body-bar">
        <span>{contentType ?? 'unknown type'}</span>
        <span className="axonpack-sbx-summary-end">
          {json !== undefined &&
            (['preview', 'raw'] as const).map((key) => (
              <button
                key={key}
                className="axonpack-sbx-toggle"
                aria-pressed={showing === key}
                onClick={() => setMode(key)}>
                {key === 'preview' ? 'Preview' : 'Raw'}
              </button>
            ))}
          <button
            className="axonpack-net-button"
            data-icon="copy"
            title="Copy the body"
            aria-label="Copy the body"
            {...{ [COPY_ATTRIBUTE]: raw }}
          />
        </span>
      </div>
      {showing === 'preview' && json !== undefined ? (
        <JsonTree value={json} />
      ) : (
        <ol className="axonpack-sbx-lines">
          {raw.split('\n').map((line, index) => (
            <li key={index}>{line}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
