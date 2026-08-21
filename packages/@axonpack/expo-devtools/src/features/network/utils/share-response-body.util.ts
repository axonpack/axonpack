import { Platform, Share } from 'react-native';

import { encodeBase64 } from '../../../core/utils/base64.util';
import type { NetworkLogEntry } from '../stores/network-log.store';

const EXTENSIONS: Record<string, string> = {
  'application/json': 'json',
  'application/xml': 'xml',
  'text/xml': 'xml',
  'text/html': 'html',
  'text/plain': 'txt',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
  'application/zip': 'zip',
};

/** Named after the request, so a saved body is recognisable once it is out of the app. */
export function responseFileName(entry: NetworkLogEntry): string {
  const fromUrl = entry.url.split('?')[0].split('/').filter(Boolean).pop() ?? 'response';
  const base = fromUrl.replace(/[^\w.-]/g, '_').slice(0, 60) || 'response';
  if (base.includes('.')) return base;
  const extension = entry.mimeType ? EXTENSIONS[entry.mimeType] : undefined;
  return extension ? `${base}.${extension}` : base;
}

/**
 * Hands one response body to the OS share sheet, which is this package's only route out to a file —
 * the log export works the same way, and for the same reason: no filesystem dependency.
 *
 * A body already captured as bytes is passed through as it is. A text one is encoded on the way out,
 * so a `data:` URL is what the sheet receives either way.
 */
export async function shareResponseBody(entry: NetworkLogEntry) {
  const mimeType = entry.mimeType ?? 'application/octet-stream';
  const base64 = entry.responseBase64 ?? (entry.responseBody && encodeBase64(entry.responseBody));
  if (!base64) return;

  try {
    if (Platform.OS === 'ios') {
      await Share.share({
        title: responseFileName(entry),
        url: `data:${mimeType};base64,${base64}`,
      });
      return;
    }
    // Android's `Share` takes text only, so a body that is not text has nothing to hand it.
    if (entry.responseBody === undefined) return;
    await Share.share({ title: responseFileName(entry), message: entry.responseBody });
  } catch {
    // The sheet was dismissed, or there is nothing installed to share to.
  }
}
