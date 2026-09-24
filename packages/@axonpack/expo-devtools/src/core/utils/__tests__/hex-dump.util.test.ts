import { hexDump } from '../hex-dump.util';

describe('hexDump', () => {
  it('lays out offset, bytes and printable characters, padding a short last row', () => {
    // "Hi!\n" and a byte outside printable ASCII.
    const { rows, hiddenBytes } = hexDump('SGkhCv8=');
    expect(rows).toEqual([
      {
        offset: '00000000',
        bytes: '48 69 21 0a ff'.padEnd(47, ' '),
        ascii: 'Hi!..',
      },
    ]);
    expect(hiddenBytes).toBe(0);
  });

  it('stops at the row cap and counts what it left out', () => {
    const bytes = new Uint8Array(512 * 16 + 5);
    const base64 = Buffer.from(bytes).toString('base64');
    const { rows, hiddenBytes } = hexDump(base64);
    expect(rows).toHaveLength(512);
    expect(hiddenBytes).toBe(5);
  });
});
