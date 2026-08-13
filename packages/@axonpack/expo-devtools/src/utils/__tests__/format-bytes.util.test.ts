import { formatSize } from '../format-bytes.util';

describe('formatSize', () => {
  it('distinguishes an unknown size from a zero one', () => {
    expect(formatSize(undefined)).toBe('–');
    expect(formatSize(0)).toBe('0 B');
  });

  it('switches unit at each 1024 boundary', () => {
    expect(formatSize(1023)).toBe('1023 B');
    expect(formatSize(1024)).toBe('1.0 KB');
    expect(formatSize(1024 * 1024 - 1)).toBe('1024.0 KB');
    expect(formatSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatSize(1024 ** 4)).toBe('1.0 TB');
  });

  it('keeps values just over a gigabyte in megabytes', () => {
    expect(formatSize(1024 ** 3)).toBe('1024.0 MB');
    expect(formatSize(1.4 * 1024 ** 3)).toBe('1433.6 MB');
    expect(formatSize(1.5 * 1024 ** 3)).toBe('1.5 GB');
    expect(formatSize(2 * 1024 ** 3)).toBe('2.0 GB');
  });

  it('reads device-scale values in GB and TB', () => {
    expect(formatSize(8 * 1024 ** 3)).toBe('8.0 GB');
    expect(formatSize(256 * 1024 ** 3)).toBe('256.0 GB');
    expect(formatSize(2 * 1024 ** 4)).toBe('2.0 TB');
  });
});
