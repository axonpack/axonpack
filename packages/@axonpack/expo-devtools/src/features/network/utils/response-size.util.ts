import type { NetworkLogEntry } from '../stores/network-log.store';

/**
 * The two sizes a compressed response has, kept apart because they answer different questions: what
 * the connection actually carried, and how much data the app ended up with.
 *
 * They used to be one number, and that number was whichever of the two happened to be available —
 * `content-length` when the server sent one, the body's own length when it did not. For a gzipped
 * response those are wildly different figures under one label.
 */
export type ResponseSizes = {
  /** What crossed the connection, encoding and all. */
  wireBytes?: number;
  /** What the app was handed, after the platform decoded it. */
  decodedBytes?: number;
  /** How much the encoding saved, 0–1. Only when both sizes are known and the wire was smaller. */
  savedRatio?: number;
  /** Whether this response was encoded at all — one size is the whole story when it was not. */
  compressed: boolean;
};

/**
 * Bytes, not characters. `String.length` counts UTF-16 units, so it reads a two-byte `é` as one and a
 * four-byte emoji as two — a body of prose in any non-Latin script is meaningfully bigger than its
 * length suggests, and comparing that against a byte count off the wire would invent a saving.
 */
export function utf8ByteLength(text: string): number {
  let bytes = 0;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      // A surrogate pair is one four-byte character, so the low half is counted with the high one.
      bytes += 4;
      index += 1;
    } else bytes += 3;
  }
  return bytes;
}

/** `identity` is the spec's way of saying "not encoded", and some servers do send it. */
function declaredEncoding(headers: Record<string, string> | undefined): string | undefined {
  const value = headers?.['content-encoding']?.trim().toLowerCase();
  return value === undefined || value === '' || value === 'identity' ? undefined : value;
}

function declaredLength(headers: Record<string, string> | undefined): number | undefined {
  const raw = headers?.['content-length'];
  if (raw === undefined) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

/** Base64 carries three bytes in every four characters, minus whatever the padding stands in for. */
function base64ByteLength(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function bodyBytes(entry: NetworkLogEntry): number | undefined {
  if (entry.responseBase64 !== undefined) return base64ByteLength(entry.responseBase64);
  if (entry.responseBody !== undefined) return utf8ByteLength(entry.responseBody);
  return undefined;
}

/**
 * What the two sizes are, from the best source that answered.
 *
 * The platform's own byte counts win when there are any: they are measured on the socket rather than
 * inferred, and they are the only source that knows both numbers for certain. Failing that, a
 * declared `content-length` on an encoded response is the wire size — the header describes what was
 * sent, not what arrived — and the body we stored is the decoded size.
 */
export function resolveResponseSizes(entry: NetworkLogEntry): ResponseSizes {
  const encoding = declaredEncoding(entry.responseHeaders);
  const measured = entry.transfer;

  const wireBytes =
    measured?.wireBytes ?? (encoding ? declaredLength(entry.responseHeaders) : undefined);
  const decodedBytes = measured?.decodedBytes ?? bodyBytes(entry);

  const compressed =
    encoding !== undefined ||
    (wireBytes !== undefined && decodedBytes !== undefined && wireBytes < decodedBytes);

  const savedRatio =
    wireBytes !== undefined &&
    decodedBytes !== undefined &&
    decodedBytes > 0 &&
    wireBytes < decodedBytes
      ? 1 - wireBytes / decodedBytes
      : undefined;

  return { wireBytes, decodedBytes, savedRatio, compressed };
}
