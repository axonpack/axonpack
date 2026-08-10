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
  });
});
