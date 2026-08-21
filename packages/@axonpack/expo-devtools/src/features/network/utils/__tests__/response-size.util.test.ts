import { resolveResponseSizes, utf8ByteLength } from '../response-size.util';
import type { NetworkLogEntry } from '../../stores/network-log.store';

function entry(patch: Partial<NetworkLogEntry>): NetworkLogEntry {
  return {
    kind: 'http',
    id: 'e1',
    method: 'GET',
    url: 'https://example.test/a',
    status: 'success',
    startedAt: 0,
    ...patch,
  };
}

describe('utf8ByteLength', () => {
  it('counts an ASCII string as one byte per character', () => {
    expect(utf8ByteLength('hello')).toBe(5);
  });

  // The reason this exists: `String.length` would say 1 here, and comparing that against a byte
  // count off the wire would invent a saving that never happened.
  it('counts a two-byte character as two', () => {
    expect(utf8ByteLength('é')).toBe(2);
  });

  it('counts a three-byte character as three', () => {
    expect(utf8ByteLength('日')).toBe(3);
  });

  it('counts a surrogate pair as the one four-byte character it is', () => {
    expect(utf8ByteLength('😀')).toBe(4);
  });

  it('has nothing to count in an empty string', () => {
    expect(utf8ByteLength('')).toBe(0);
  });
});

describe('resolveResponseSizes', () => {
  it('prefers what the platform counted over anything declared', () => {
    const sizes = resolveResponseSizes(
      entry({
        transfer: { wireBytes: 1000, decodedBytes: 8000 },
        responseHeaders: { 'content-encoding': 'gzip', 'content-length': '999' },
        responseBody: 'x'.repeat(7000),
      })
    );

    expect(sizes.wireBytes).toBe(1000);
    expect(sizes.decodedBytes).toBe(8000);
    expect(sizes.savedRatio).toBeCloseTo(0.875);
    expect(sizes.compressed).toBe(true);
  });

  // A `content-length` describes what was sent, so on an encoded response it is the wire size and the
  // body we stored is the decoded one.
  it('reads a declared length as the wire size when the response was encoded', () => {
    const sizes = resolveResponseSizes(
      entry({
        responseHeaders: { 'content-encoding': 'br', 'content-length': '200' },
        responseBody: 'x'.repeat(1000),
      })
    );

    expect(sizes).toMatchObject({ wireBytes: 200, decodedBytes: 1000, compressed: true });
    expect(sizes.savedRatio).toBeCloseTo(0.8);
  });

  it('does not read a declared length as a wire size when nothing was encoded', () => {
    const sizes = resolveResponseSizes(
      entry({ responseHeaders: { 'content-length': '1000' }, responseBody: 'x'.repeat(1000) })
    );

    expect(sizes.wireBytes).toBeUndefined();
    expect(sizes.decodedBytes).toBe(1000);
    expect(sizes.compressed).toBe(false);
    expect(sizes.savedRatio).toBeUndefined();
  });

  it('treats an identity encoding as the no-encoding it means', () => {
    const sizes = resolveResponseSizes(
      entry({
        responseHeaders: { 'content-encoding': 'identity', 'content-length': '40' },
        responseBody: 'x'.repeat(40),
      })
    );

    expect(sizes.compressed).toBe(false);
    expect(sizes.wireBytes).toBeUndefined();
  });

  it('measures a binary body from its bytes rather than its base64', () => {
    // 8 base64 characters with one pad stand for 5 bytes.
    expect(resolveResponseSizes(entry({ responseBase64: 'AAAAAAA=' })).decodedBytes).toBe(5);
  });

  it('reports a stream, which has no body and no length, as neither size', () => {
    const sizes = resolveResponseSizes(entry({ eventStream: true }));

    expect(sizes).toEqual({
      wireBytes: undefined,
      decodedBytes: undefined,
      savedRatio: undefined,
      compressed: false,
    });
  });

  // An encoding that made the payload bigger is not a saving, and saying "-4%" reads as a bug.
  it('claims no saving when the encoded body was not smaller', () => {
    const sizes = resolveResponseSizes(
      entry({ transfer: { wireBytes: 120, decodedBytes: 100 }, responseBody: 'x'.repeat(100) })
    );

    expect(sizes.savedRatio).toBeUndefined();
    expect(sizes.compressed).toBe(false);
  });
});
