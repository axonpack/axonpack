import { useState } from 'react';

import { CookiesTab } from './cookies-tab.component';
import { EventsTab } from './events-tab.component';
import { HeadersTab } from './headers-tab.component';
import { InitiatorTab } from './initiator-tab.component';
import { PayloadTab, hasPayload } from './payload-tab.component';
import { PreviewTab } from './preview-tab.component';
import { ResponseTab } from './response-tab.component';
import { TimingTab } from './timing-tab.component';
import type { NetworkEntry } from '../../../../features/network/stores/network-log.store';

type Tab =
  'headers' | 'payload' | 'preview' | 'response' | 'events' | 'timing' | 'cookies' | 'initiator';

// The app's detail panel's tabs, in its order.
const TABS: { key: Tab; label: string }[] = [
  { key: 'headers', label: 'Headers' },
  { key: 'payload', label: 'Payload' },
  { key: 'preview', label: 'Preview' },
  { key: 'response', label: 'Response' },
  { key: 'events', label: 'EventStream' },
  { key: 'timing', label: 'Timing' },
  { key: 'cookies', label: 'Cookies' },
  { key: 'initiator', label: 'Initiator' },
];

/**
 * The tabs a row has something for, by the app's rules. A stream's events are its body, so EventStream
 * stands where Preview and Response would. A socket is only its handshake so far.
 */
function tabsFor(entry: NetworkEntry): Tab[] {
  if (entry.kind === 'websocket') return ['headers'];
  return TABS.map((tab) => tab.key).filter((key) => {
    if (key === 'payload') return hasPayload(entry);
    if (key === 'initiator') return Boolean(entry.initiator?.length);
    if (key === 'events') return Boolean(entry.eventStream);
    if (key === 'preview' || key === 'response') return !entry.eventStream;
    return true;
  });
}

/**
 * Chrome's request pane, beside the table while a row is open. The picked tab stays picked from one
 * request to the next, as Chrome's does, and falls back to Headers on a request without it.
 */
export function RequestDetail({ entry, onClose }: { entry: NetworkEntry; onClose: () => void }) {
  const [picked, setPicked] = useState<Tab>('headers');
  const tabs = tabsFor(entry);
  const tab = tabs.includes(picked) ? picked : 'headers';

  return (
    <div className="axonpack-net-detail">
      <div className="axonpack-net-detail-bar" role="tablist">
        <button
          className="axonpack-net-button axonpack-net-detail-close"
          data-icon="cross"
          title="Close"
          aria-label="Close"
          onClick={onClose}
        />
        {TABS.filter(({ key }) => tabs.includes(key)).map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={key === tab}
            className="axonpack-net-detail-tab"
            onClick={() => setPicked(key)}>
            {label}
          </button>
        ))}
      </div>
      <div className="axonpack-net-detail-body">
        {tab === 'headers' && <HeadersTab entry={entry} />}
        {tab === 'payload' && entry.kind === 'http' && <PayloadTab entry={entry} />}
        {tab === 'preview' && entry.kind === 'http' && <PreviewTab entry={entry} />}
        {tab === 'response' && entry.kind === 'http' && <ResponseTab entry={entry} />}
        {tab === 'events' && entry.kind === 'http' && <EventsTab entry={entry} />}
        {tab === 'timing' && entry.kind === 'http' && <TimingTab entry={entry} />}
        {tab === 'cookies' && entry.kind === 'http' && <CookiesTab entry={entry} />}
        {tab === 'initiator' && entry.kind === 'http' && <InitiatorTab entry={entry} />}
      </div>
    </div>
  );
}
