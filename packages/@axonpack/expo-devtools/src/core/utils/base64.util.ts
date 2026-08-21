const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Hand-rolled because Hermes ships no `btoa`, and `Buffer` is a Node global that React Native only
 * has when something else has polyfilled it. Encodes the UTF-8 bytes, so a non-ASCII response body
 * or stored value survives.
 *
 * Shared by the network and storage exports, which is what earned it a spot at the layer root.
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

/**
 * The same encoding for bytes that are already bytes — a binary response body, where there is no
 * text to run through UTF-8 first. Kept beside the string version so both share the one alphabet.
 */
export function encodeBytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const chunk = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += BASE64_ALPHABET[(chunk >> 18) & 63] + BASE64_ALPHABET[(chunk >> 12) & 63];
    out += i + 1 < bytes.length ? BASE64_ALPHABET[(chunk >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? BASE64_ALPHABET[chunk & 63] : '=';
  }
  return out;
}

/** Hermes ships no `atob` either, so the way back is hand-rolled too — the hex view needs bytes. */
export function decodeBase64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));

  let out = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const chunk =
      (BASE64_ALPHABET.indexOf(clean[i]) << 18) |
      (BASE64_ALPHABET.indexOf(clean[i + 1]) << 12) |
      ((clean[i + 2] === undefined ? 0 : BASE64_ALPHABET.indexOf(clean[i + 2])) << 6) |
      (clean[i + 3] === undefined ? 0 : BASE64_ALPHABET.indexOf(clean[i + 3]));

    bytes[out++] = (chunk >> 16) & 0xff;
    if (clean[i + 2] !== undefined) bytes[out++] = (chunk >> 8) & 0xff;
    if (clean[i + 3] !== undefined) bytes[out++] = chunk & 0xff;
  }

  return bytes.subarray(0, out);
}
