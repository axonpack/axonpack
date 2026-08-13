import { downsampleMin } from '../downsample.util';

describe('downsampleMin', () => {
  it('returns the series untouched when it already fits', () => {
    expect(downsampleMin([60, 58, 59], 60)).toEqual([60, 58, 59]);
  });

  it('keeps a dip that averaging would erase', () => {
    const healthy = Array.from({ length: 10 }, () => 60);
    const withStall = [...healthy.slice(0, 5), 8, ...healthy.slice(6)];
    expect(downsampleMin(withStall, 1)).toEqual([8]);
  });

  it('splits into the requested number of buckets', () => {
    const values = Array.from({ length: 600 }, (_, index) => index);
    expect(downsampleMin(values, 60)).toHaveLength(60);
  });

  it('takes the lowest value in each bucket, in order', () => {
    expect(downsampleMin([60, 30, 60, 45], 2)).toEqual([30, 45]);
  });

  it('handles an empty series and a zero bucket count', () => {
    expect(downsampleMin([], 60)).toEqual([]);
    expect(downsampleMin([60], 0)).toEqual([]);
  });
});
