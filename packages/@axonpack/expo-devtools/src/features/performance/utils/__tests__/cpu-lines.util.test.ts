import { coreCountLabel, cpuLines } from '../cpu-lines.util';

const colors = { cpuApp: 'grey', cpuJs: 'amber', cpuUi: 'blue' };

describe('cpuLines', () => {
  it('drops unread samples from a line instead of drawing them as 0', () => {
    const [total, js, main] = cpuLines(
      [
        { timestamp: 1, total: 50, js: 40, main: 5 },
        { timestamp: 2, total: 60, js: undefined, main: 6 },
      ],
      colors
    );
    expect(total.values).toEqual([50, 60]);
    expect(js.values).toEqual([40]);
    expect(js.latest).toBeUndefined();
    expect(main.latest).toBe(6);
  });

  it('names the lines in plain words', () => {
    expect(cpuLines([], colors).map((line) => line.label)).toEqual([
      'Total',
      'JavaScript',
      'UI thread',
    ]);
  });

  it('gives each line its own colour token', () => {
    expect(cpuLines([], colors).map((line) => line.color)).toEqual(['grey', 'amber', 'blue']);
  });

  it('labels the core count, and says nothing when it is unknown', () => {
    expect(coreCountLabel([{ timestamp: 1, cores: 8, total: 5 }])).toBe('8 cores');
    expect(coreCountLabel([{ timestamp: 1, cores: 1, total: 5 }])).toBe('1 core');
    expect(coreCountLabel([{ timestamp: 1, total: 5 }])).toBeUndefined();
    expect(coreCountLabel([])).toBeUndefined();
  });
});
