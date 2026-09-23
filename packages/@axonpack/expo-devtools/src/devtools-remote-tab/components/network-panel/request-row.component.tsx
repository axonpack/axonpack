import { memo } from 'react';

import { formatSize } from '../../../core/utils/format-bytes.util';
import { formatDuration } from '../../../core/utils/format-duration.util';
import type { NetworkEntry } from '../../../features/network/stores/network-log.store';
import {
  formatSource,
  getDisplayNameWithQuery,
  getStatusText,
  isErrorStatus,
} from '../../../features/network/utils/formatters.util';
import { resolveResponseSizes } from '../../../features/network/utils/response-size.util';
import type { ChromeIcon } from '../../constants/chrome-icons.const';

/**
 * The icon before the name, and its colour (`data-tone` in the CSS). Read in the same order as the
 * app row's `getResponseTypeVisual`, so both surfaces pick the same type for a response.
 */
function fileIcon(entry: NetworkEntry): { icon: ChromeIcon; tone?: string } {
  if (entry.kind === 'websocket') return { icon: 'file-websocket' };
  const mime = entry.mimeType;
  if (!mime || entry.eventStream) return { icon: 'file-fetch-xhr' };
  if (mime.startsWith('image/')) return { icon: 'file-image', tone: 'green' };
  if (mime.startsWith('audio/') || mime.startsWith('video/')) {
    return { icon: 'file-media', tone: 'green' };
  }
  if (mime.includes('javascript')) return { icon: 'file-script', tone: 'yellow' };
  if (mime.includes('css')) return { icon: 'file-stylesheet', tone: 'purple' };
  if (mime.includes('html')) return { icon: 'file-document', tone: 'blue' };
  if (mime.includes('font') || /\b(woff2?|ttf|otf)\b/.test(mime)) {
    return { icon: 'file-font', tone: 'teal' };
  }
  if (mime.includes('wasm')) return { icon: 'file-wasm', tone: 'purple' };
  if (mime.includes('json')) return { icon: 'file-json', tone: 'orange' };
  if (mime.includes('xml') || mime.includes('text/plain')) return { icon: 'file-document' };
  return { icon: 'file-generic' };
}

/** Chrome's words for a row that has no code to show. */
function statusCell(entry: NetworkEntry): { main: string; sub?: string } {
  if (entry.kind === 'websocket') return { main: entry.status, sub: entry.closeReason };
  if (entry.status === 'pending') return { main: entry.eventStream ? '(stream)' : '(pending)' };
  if (entry.canceled) return { main: '(canceled)' };
  if (entry.statusCode === undefined) return { main: '(failed)', sub: entry.error };
  return {
    main: String(entry.statusCode),
    sub: getStatusText(entry.statusCode, entry.statusText),
  };
}

/** Chrome's pair: what the wire carried, then what the app got. */
function sizeCell(entry: NetworkEntry, count: number | undefined): { main: string; sub?: string } {
  if (entry.kind === 'websocket') return { main: `${count ?? 0} messages` };
  if (entry.eventStream) return { main: `${count ?? 0} events` };
  const { wireBytes, decodedBytes } = resolveResponseSizes(entry);
  return {
    main: formatSize(wireBytes ?? entry.size),
    sub: decodedBytes === undefined ? undefined : formatSize(decodedBytes),
  };
}

/** Chrome's pair again: the whole request, then how long the first byte took. */
function timeCell(entry: NetworkEntry): { main: string; sub?: string } {
  if (entry.duration === undefined) return { main: 'Pending' };
  return {
    main: formatDuration(entry.duration),
    sub: entry.kind === 'http' ? formatDuration(entry.ttfb) : undefined,
  };
}

function cell({ main, sub }: { main: string; sub?: string }, big: boolean) {
  return (
    <span title={sub ? `${main}\n${sub}` : main}>
      {main}
      {big && sub !== undefined && <span className="axonpack-net-sub">{sub}</span>}
    </span>
  );
}

function RequestRowBase({
  entry,
  big,
  count,
}: {
  entry: NetworkEntry;
  big: boolean;
  /** Messages on a socket or events on a stream. Passed in, because it moves without the entry. */
  count?: number;
}) {
  const name = getDisplayNameWithQuery(entry.url);
  const { icon, tone } = fileIcon(entry);
  const failed =
    entry.kind === 'websocket'
      ? entry.status === 'error'
      : isErrorStatus(entry.status, entry.statusCode);

  return (
    <div className="axonpack-net-row" data-failed={failed || undefined}>
      <span className="axonpack-net-name" title={entry.url}>
        <span className="axonpack-net-file" data-icon={icon} data-tone={tone} />
        <span className="axonpack-net-name-text">
          {name}
          {big && <span className="axonpack-net-sub">{entry.url}</span>}
        </span>
      </span>
      <span>{entry.method}</span>
      {cell(statusCell(entry), big)}
      <span>{entry.source ? formatSource(entry.source) : ''}</span>
      {cell(sizeCell(entry, count), big)}
      {cell(timeCell(entry), big)}
    </div>
  );
}

/**
 * The store keeps an entry's object until that entry changes, so this skips every row but the one
 * that moved.
 */
export const RequestRow = memo(RequestRowBase);
