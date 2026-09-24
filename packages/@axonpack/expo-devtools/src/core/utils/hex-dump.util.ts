import { decodeBase64ToBytes } from './base64.util';

const BYTES_PER_ROW = 16;
/** Enough to see what a body is without laying out thousands of rows nobody scrolls to. */
const MAX_ROWS = 512;

export type HexDumpRow = { offset: string; bytes: string; ascii: string };

function hex(byte: number): string {
  return byte.toString(16).padStart(2, '0');
}

/** The printable-ASCII column, where anything else is a dot, as every hex dump has always done. */
function printable(byte: number): string {
  return byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : '.';
}

/**
 * A body's bytes as the rows of a hex dump, capped, with how many bytes the cap left out. Shared by
 * the app's view and the DevTools tab's, so both show the same dump of the same body.
 */
export function hexDump(base64: string): { rows: HexDumpRow[]; hiddenBytes: number } {
  const bytes = decodeBase64ToBytes(base64);
  const rowCount = Math.min(Math.ceil(bytes.length / BYTES_PER_ROW), MAX_ROWS);
  const rows = Array.from({ length: rowCount }, (_, index) => {
    const row = bytes.subarray(index * BYTES_PER_ROW, (index + 1) * BYTES_PER_ROW);
    return {
      offset: (index * BYTES_PER_ROW).toString(16).padStart(8, '0'),
      // Padded so a short last row keeps its ASCII column in line with the rows above it.
      bytes: Array.from(row, hex)
        .join(' ')
        .padEnd(BYTES_PER_ROW * 3 - 1, ' '),
      ascii: Array.from(row, printable).join(''),
    };
  });
  return { rows, hiddenBytes: Math.max(0, bytes.length - rowCount * BYTES_PER_ROW) };
}
