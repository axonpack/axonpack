import { useState } from 'react';

import { CookiesTab } from './cookies-tab.component';
import { EventsTab } from './events-tab.component';
import { HeadersTab } from './headers-tab.component';
import { InitiatorTab } from './initiator-tab.component';
import { MessagesTab } from './messages-tab.component';
import { OverridePane } from './override-pane.component';
import { PayloadTab, hasPayload } from './payload-tab.component';
import { PreviewTab } from './preview-tab.component';
import { ResponseTab } from './response-tab.component';
import { SandboxPane } from './sandbox';
import { TimingTab } from './timing-tab.component';
import type {
  NetworkEntry,
  NetworkLogEntry,
} from '../../../../features/network/stores/network-log.store';
import { EntryMenu } from '../entry-menu.component';

/** What the request pane shows: its tabs, or one of the editors the ⋮ menu opens. */
export type RequestPane = 'detail' | 'override' | 'sandbox';

type Tab =
  | 'headers'
  | 'messages'
  | 'payload'
  | 'preview'
  | 'response'
  | 'events'
  | 'timing'
  | 'cookies'
  | 'initiator';

// The app's detail panel's tabs, in its order.
const TABS: { key: Tab; label: string }[] = [
  { key: 'headers', label: 'Headers' },
  // The app's socket sheet is a message list under the socket's summary, which is Headers here.
  { key: 'messages', label: 'Messages' },
  { key: 'payload', label: 'Payload' },
  { key: 'preview', label: 'Preview' },
  { key: 'response', label: 'Response' },
  { key: 'events', label: 'EventStream' },
  { key: 'timing', label: 'Timing' },
  { key: 'cookies', label: 'Cookies' },
  { key: 'initiator', label: 'Initiator' },
];

/**
 * When a request has something for each tab, by the app's rules. A stream's events are its body, so
 * EventStream stands where Preview and Response would. Keyed by every tab, so a tab added without a
 * rule does not compile, rather than showing on every request.
 */
const SHOWS: Record<Tab, (entry: NetworkLogEntry) => boolean> = {
  headers: () => true,
  messages: () => false,
  payload: hasPayload,
  preview: (entry) => !entry.eventStream,
  response: (entry) => !entry.eventStream,
  events: (entry) => Boolean(entry.eventStream),
  timing: () => true,
  cookies: () => true,
  initiator: (entry) => Boolean(entry.initiator?.length),
};

/** A socket is its handshake and the messages since. */
function tabsFor(entry: NetworkEntry): Tab[] {
  if (entry.kind === 'websocket') return ['headers', 'messages'];
  return TABS.map((tab) => tab.key).filter((key) => SHOWS[key](entry));
}

/**
 * Chrome's request pane, beside the table while a row is open. The picked tab stays picked from one
 * request to the next, as Chrome's does, and falls back to Headers on a request without it.
 */
export function RequestDetail({
  entry,
  pane,
  onPane,
  onClose,
}: {
  entry: NetworkEntry;
  pane: RequestPane;
  onPane: (pane: RequestPane) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<Tab>('headers');
  const [menuOpen, setMenuOpen] = useState(false);
  const tabs = tabsFor(entry);
  const tab = tabs.includes(picked) ? picked : 'headers';

  if (entry.kind === 'http' && pane !== 'detail') {
    return (
      <div className="axonpack-net-detail">
        <div className="axonpack-net-detail-bar">
          <button
            className="axonpack-net-button axonpack-net-detail-close"
            data-icon="cross"
            title="Back to the request"
            aria-label="Back to the request"
            onClick={() => onPane('detail')}
          />
          <span className="axonpack-net-detail-title">
            {pane === 'override' ? 'Override response' : 'Sandbox'}
          </span>
        </div>
        <div className="axonpack-net-detail-body">
          {/* Keyed, so another request starts from its own draft rather than this one's. */}
          {pane === 'override' ? (
            <OverridePane key={entry.id} entry={entry} onDone={() => onPane('detail')} />
          ) : (
            <SandboxPane key={entry.id} entry={entry} />
          )}
        </div>
      </div>
    );
  }

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
        {entry.kind === 'http' && (
          // The app's ⋮ in its detail header, at the end of the bar as there.
          <span className="axonpack-net-detail-more">
            <button
              className="axonpack-net-button"
              title="More"
              aria-label="More"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}>
              <span className="axonpack-material" data-material="more-vert" />
            </button>
            {menuOpen && (
              <EntryMenu
                entry={entry}
                align="right"
                onClose={() => setMenuOpen(false)}
                onOpen={onPane}
              />
            )}
          </span>
        )}
      </div>
      <div className="axonpack-net-detail-body">
        {tab === 'headers' && <HeadersTab entry={entry} />}
        {tab === 'messages' && entry.kind === 'websocket' && <MessagesTab entry={entry} />}
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
