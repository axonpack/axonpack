import { decodeBase64ToBytes, encodeBytesToBase64 } from '../base64.util';

const bytes = (...values: number[]) => new Uint8Array(values);

describe('encodeBytesToBase64', () => {
  it('pads a length that is not a multiple of three', () => {
    expect(encodeBytesToBase64(bytes(0x4d))).toBe('TQ==');
    expect(encodeBytesToBase64(bytes(0x4d, 0x61))).toBe('TWE=');
    expect(encodeBytesToBase64(bytes(0x4d, 0x61, 0x6e))).toBe('TWFu');
  });

  // A byte over 0x7f is where a string-based encoder would have run it through UTF-8 first and
  // produced two bytes out of one.
  it('encodes a high byte as itself', () => {
    expect(encodeBytesToBase64(bytes(0xff, 0xd8, 0xff))).toBe('/9j/');
  });

  it('is empty for no bytes', () => {
    expect(encodeBytesToBase64(bytes())).toBe('');
  });
});

describe('decodeBase64ToBytes', () => {
  it('round-trips every byte value', () => {
    const all = new Uint8Array(256);
    for (let i = 0; i < 256; i += 1) all[i] = i;

    expect(Array.from(decodeBase64ToBytes(encodeBytesToBase64(all)))).toEqual(Array.from(all));
  });

  it('reads a padded string back to the right length', () => {
    expect(Array.from(decodeBase64ToBytes('TQ=='))).toEqual([0x4d]);
    expect(Array.from(decodeBase64ToBytes('TWE='))).toEqual([0x4d, 0x61]);
  });

  it('is empty for an empty string', () => {
    expect(decodeBase64ToBytes('')).toHaveLength(0);
  });
});
