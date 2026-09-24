import { chartPoints } from '../line-chart.component';

describe('chartPoints', () => {
  it('fills from the right against the capacity', () => {
    expect(chartPoints([0, 10], 10, 5)).toBe('75,99 100,1');
  });

  it('clamps to the top and the bottom', () => {
    expect(chartPoints([-5, 50], 10, 2)).toBe('0,99 100,1');
  });
});
