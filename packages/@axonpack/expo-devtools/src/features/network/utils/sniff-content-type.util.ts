/**
 * What a body is, when nothing said. A response with no `Content-Type` is common enough from a
 * hand-rolled server, and without this the panel calls it text and shows the bytes as mojibake.
 *
 * Magic numbers only — the first few bytes of the formats a mobile app actually receives. Guessing
 * past that would be worse than saying nothing, so anything unrecognised stays unknown.
 */
const SIGNATURES: { type: string; bytes: number[] }[] = [
  { type: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { type: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { type: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  { type: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
  // Both are ZIP containers, which is all the first bytes can tell us.
  { type: 'application/zip', bytes: [0x50, 0x4b, 0x03, 0x04] },
];

export function sniffContentTypeFromBytes(bytes: Uint8Array): string | undefined {
  for (const { type, bytes: signature } of SIGNATURES) {
    if (signature.every((byte, index) => bytes[index] === byte)) return type;
  }
  return undefined;
}

/** The same question for a body already read as text, where the shape is the only evidence. */
export function sniffContentTypeFromText(body: string): string | undefined {
  const start = body.trimStart().slice(0, 100);
  if (!start) return undefined;
  if (start.startsWith('{') || start.startsWith('[')) return 'application/json';
  if (/^<\?xml/i.test(start)) return 'application/xml';
  if (/^<(!doctype html|html)\b/i.test(start)) return 'text/html';
  if (/^<svg\b/i.test(start)) return 'image/svg+xml';
  return undefined;
}

/** Whether a declared type is one whose body is worth reading as text at all. */
export function isTextLikeContentType(contentType: string | undefined): boolean {
  if (!contentType) return true;
  const type = contentType.toLowerCase();
  return (
    type.startsWith('text/') ||
    type.includes('json') ||
    type.includes('xml') ||
    type.includes('javascript') ||
    type.includes('urlencoded') ||
    type.includes('svg')
  );
}
