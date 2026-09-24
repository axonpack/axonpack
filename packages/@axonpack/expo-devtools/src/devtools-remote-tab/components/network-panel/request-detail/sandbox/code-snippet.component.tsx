import { COPY_ATTRIBUTE } from '@axonpack/react-native-devtools-tab';
import { useState } from 'react';

import { CODE_SNIPPET_TARGETS } from '../../../../../features/network/utils/code-snippets.util';
import {
  buildSandboxRequest,
  type SandboxDraft,
} from '../../../../../features/network/utils/sandbox.util';

/**
 * The draft as code, docked at the foot of the request. Folded to start with, as Scalar's is: it is
 * for taking the request somewhere else, not for editing it.
 */
export function CodeSnippet({ draft }: { draft: SandboxDraft }) {
  const [targetId, setTargetId] = useState(CODE_SNIPPET_TARGETS[0].id);
  const target =
    CODE_SNIPPET_TARGETS.find((candidate) => candidate.id === targetId) ?? CODE_SNIPPET_TARGETS[0];
  const request = buildSandboxRequest(draft);
  const code = target.build({
    method: request.method,
    url: request.url,
    requestHeaders: request.headers,
    requestBody: request.body,
  });

  return (
    <details className="axonpack-sbx-section axonpack-sbx-snippet">
      <summary>
        Code Snippet
        <span className="axonpack-sbx-summary-end">
          <span className="axonpack-net-select">
            <select
              value={target.id}
              aria-label="Language"
              onChange={(event) => setTargetId(String(event.target.value))}>
              {CODE_SNIPPET_TARGETS.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.label}
                </option>
              ))}
            </select>
          </span>
          {/* Copied by the browser, so it lands on this computer's clipboard rather than the device's. */}
          <button
            className="axonpack-net-button"
            data-icon="copy"
            title="Copy"
            aria-label="Copy"
            {...{ [COPY_ATTRIBUTE]: code }}
          />
        </span>
      </summary>
      <ol className="axonpack-sbx-lines">
        {code.split('\n').map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ol>
    </details>
  );
}
