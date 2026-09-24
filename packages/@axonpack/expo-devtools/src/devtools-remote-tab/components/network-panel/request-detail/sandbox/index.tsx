import { useState } from 'react';

import { AddressBar } from './address-bar.component';
import { RequestSection } from './request-section.component';
import { ResponseSection } from './response-section.component';
import type { NetworkLogEntry } from '../../../../../features/network/stores/network-log.store';
import {
  buildSandboxRequest,
  sandboxDraftFor,
  sendSandboxRequest,
  type SandboxDraft,
  type SandboxResult,
} from '../../../../../features/network/utils/sandbox.util';

/**
 * The app's sandbox, laid out the way an API client is on the web: the address bar across the top,
 * the request and its response side by side, stacked when the pane is narrow.
 *
 * It sends from the device, through the app's own `fetch`, so the request goes out with the
 * device's network and conditions and is also a row in the log on both surfaces. The draft is this
 * editor's own, as the override editor's is.
 */
export function SandboxPane({ entry }: { entry: NetworkLogEntry }) {
  const [draft, setDraft] = useState<SandboxDraft>(() => sandboxDraftFor(entry));
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SandboxResult | null>(null);
  const edit = (patch: Partial<SandboxDraft>) => setDraft((current) => ({ ...current, ...patch }));

  async function send() {
    setSending(true);
    const response = await sendSandboxRequest(buildSandboxRequest(draft));
    setSending(false);
    setResult(response);
  }

  return (
    <div className="axonpack-sbx">
      <AddressBar
        method={draft.method}
        url={draft.url}
        sending={sending}
        onMethod={(method) => edit({ method })}
        onUrl={(url) => edit({ url })}
        onSend={() => void send()}
      />
      <div className="axonpack-sbx-split">
        <RequestSection draft={draft} onEdit={edit} />
        <ResponseSection sending={sending} result={result} />
      </div>
      <p className="axonpack-sbx-footnote">
        Throttling and the user agent apply here too. They are in Network settings, under the gear,
        and shared with the whole app.
      </p>
    </div>
  );
}
