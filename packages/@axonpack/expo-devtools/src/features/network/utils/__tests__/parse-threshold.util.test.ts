import { parseByteSize, parseDurationMs } from '../parse-threshold.util';

describe('parseByteSize', () => {
  it('takes a bare number as bytes, which is what the column shows', () => {
    expect(parseByteSize('500')).toBe(500);
    expect(parseByteSize(' 0 ')).toBe(0);
  });

  it('takes the units someone would type on a phone', () => {
    expect(parseByteSize('20kb')).toBe(20 * 1024);
    expect(parseByteSize('20 K')).toBe(20 * 1024);
    expect(parseByteSize('1.5mb')).toBe(1.5 * 1024 * 1024);
    expect(parseByteSize('1gb')).toBe(1024 * 1024 * 1024);
  });

  it('returns nothing for what it cannot read', () => {
    expect(parseByteSize('')).toBeNull();
    expect(parseByteSize('big')).toBeNull();
    expect(parseByteSize('12tb')).toBeNull();
  });
});

describe('parseDurationMs', () => {
  it('takes a bare number as milliseconds', () => {
    expect(parseDurationMs('250')).toBe(250);
  });

  it('takes seconds and minutes, spelled either way', () => {
    expect(parseDurationMs('800ms')).toBe(800);
    expect(parseDurationMs('1.5s')).toBe(1500);
    expect(parseDurationMs('2 sec')).toBe(2000);
    expect(parseDurationMs('1min')).toBe(60_000);
  });

  it('returns nothing for what it cannot read', () => {
    expect(parseDurationMs('')).toBeNull();
    expect(parseDurationMs('slow')).toBeNull();
    expect(parseDurationMs('3h')).toBeNull();
  });
});
