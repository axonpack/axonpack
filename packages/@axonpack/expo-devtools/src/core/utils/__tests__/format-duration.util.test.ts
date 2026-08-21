import { formatDuration } from '../format-duration.util';

describe('formatDuration', () => {
  it.each([
    [0, '0 ms'],
    [1, '1 ms'],
    [65, '65 ms'],
    [47.612, '47.6 ms'],
    [99.4, '99.4 ms'],
  ])('reads %p as %p, where the millisecond is the clearer unit', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });

  it.each([
    [100, '0.1 s'],
    [112, '0.11 s'],
    [1034.52, '1.03 s'],
    [12500, '12.5 s'],
  ])('reads %p as %p, where seconds are', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });

  // What the platform reports for a send phase, which is precision nobody needs.
  it('keeps three decimals of a sub-millisecond reading', () => {
    expect(formatDuration(0.0890493392944336)).toBe('0.089 ms');
  });

  it('says a reading is smaller than it can show rather than calling it zero', () => {
    expect(formatDuration(0.0004)).toBe('<0.001 ms');
  });

  it('has a dash for a duration nothing measured', () => {
    expect(formatDuration(undefined)).toBe('–');
  });

  // Two markers read against a clock that moved. Printing a negative length of time reads as a bug in
  // the panel rather than what it is.
  it.each([-0.001, -0.0001, -12])('reports %p as nothing rather than a negative', (ms) => {
    expect(formatDuration(ms)).toBe('0 ms');
  });
});
