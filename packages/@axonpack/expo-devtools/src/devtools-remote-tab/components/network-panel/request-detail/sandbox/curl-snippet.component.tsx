import { COPY_ATTRIBUTE } from '@axonpack/react-native-devtools-tab';

import { buildCurlCommand } from '../../../../../features/network/utils/curl.util';
import {
  buildSandboxRequest,
  type SandboxDraft,
} from '../../../../../features/network/utils/sandbox.util';

/** The draft as a command, so what is about to be sent can be run somewhere else too. */
export function CurlSnippet({ draft }: { draft: SandboxDraft }) {
  const request = buildSandboxRequest(draft);
  const curl = buildCurlCommand({
    method: request.method,
    url: request.url,
    requestHeaders: request.headers,
    requestBody: request.body,
  });

  return (
    <div className="axonpack-sbx-body">
      <pre className="axonpack-net-code axonpack-sbx-code">{curl}</pre>
      <div className="axonpack-sbx-actions">
        {/* Copied by the browser, so it lands on this computer's clipboard rather than the device's. */}
        <button className="axonpack-net-action" {...{ [COPY_ATTRIBUTE]: curl }}>
          Copy
        </button>
      </div>
    </div>
  );
}
