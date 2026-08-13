import { Platform, Share } from 'react-native';

import type { NetworkLogEntry } from '../../stores/network/network-log.store';

function fileName(): string {
  return `network-log-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
}

/**
 * Hands the given entries to the OS share sheet as JSON.
 *
 * Built on `Share` alone, so there's no filesystem to write to and nothing here produces a file on disk.
 * On iOS a base64 `data:` URL is passed alongside the text, which is what gives the sheet a named
 * attachment to offer Files and Mail; Android's `Share` accepts only text, so it receives the JSON
 * itself. Either way the log leaves the app in one step.
 */
export async function exportNetworkLog(entries: NetworkLogEntry[]) {
  const text = JSON.stringify(entries, null, 2);

  try {
    if (Platform.OS === 'ios') {
      await Share.share({
        title: fileName(),
        message: text,
        url: `data:application/json;base64,${encodeBase64(text)}`,
      });
      return;
    }
    await Share.share({ title: fileName(), message: text });
  } catch {
    // The user dismissed the sheet, or there's nothing installed to share to.
  }
}

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Hand-rolled because Hermes ships no `btoa`, and `Buffer` is a Node global that React Native only has
 * when something else has polyfilled it. Encodes the UTF-8 bytes, so a non-ASCII response body survives.
 */
export function encodeBase64(input: string): string {
  const bytes: number[] = [];
  for (const char of input) {
    const point = char.codePointAt(0) ?? 0;
    if (point < 0x80) {
      bytes.push(point);
    } else if (point < 0x800) {
      bytes.push(0xc0 | (point >> 6), 0x80 | (point & 0x3f));
    } else if (point < 0x10000) {
      bytes.push(0xe0 | (point >> 12), 0x80 | ((point >> 6) & 0x3f), 0x80 | (point & 0x3f));
    } else {
      bytes.push(
        0xf0 | (point >> 18),
        0x80 | ((point >> 12) & 0x3f),
        0x80 | ((point >> 6) & 0x3f),
        0x80 | (point & 0x3f)
      );
    }
  }

  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const chunk = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += BASE64_ALPHABET[(chunk >> 18) & 63] + BASE64_ALPHABET[(chunk >> 12) & 63];
    out += i + 1 < bytes.length ? BASE64_ALPHABET[(chunk >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? BASE64_ALPHABET[chunk & 63] : '=';
  }
  return out;
}
