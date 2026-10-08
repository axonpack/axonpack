import {
  capAtFull,
  parseTaskStatCpuMs,
  percentOfAllCores,
  percentOfOneCore,
} from '../cpu-usage.util';

// A real line from an Android 15 emulator, with utime 150 and stime 50 swapped in.
const statLine = (name: string, utime = 150, stime = 50) =>
  `4821 (${name}) S 612 612 0 0 -1 1077952576 2201 0 0 0 ${utime} ${stime} 0 0 10 -10 34 0 99210 ` +
  `15466868736 23514 18446744073709551615 1 1 0 0 0 0 4612 1 1073775864 0 0 0 -1 3 0 0 0 0 0 0 0 0 0 0 0 0 0\n`;

describe('parseTaskStatCpuMs', () => {
  it('turns utime + stime ticks into milliseconds', () => {
    expect(parseTaskStatCpuMs(statLine('mqt_v_js'), 100)).toBe(2000);
    expect(parseTaskStatCpuMs(statLine('mqt_v_js'), 250)).toBe(800);
  });

  it('reads past a thread name holding spaces and brackets', () => {
    expect(parseTaskStatCpuMs(statLine('OkHttp (2) x) S'), 100)).toBe(2000);
  });

  it('gives undefined, never 0, when there is nothing to read', () => {
    expect(parseTaskStatCpuMs(null, 100)).toBeUndefined();
    expect(parseTaskStatCpuMs(statLine('mqt_v_js'), null)).toBeUndefined();
    expect(parseTaskStatCpuMs('garbage', 100)).toBeUndefined();
    expect(parseTaskStatCpuMs('12 (short) S 1 2', 100)).toBeUndefined();
  });
});

describe('percentOfOneCore', () => {
  it('is CPU time over wall time', () => {
    expect(percentOfOneCore({ cpuMs: 1000, at: 0 }, { cpuMs: 1250, at: 1000 })).toBe(25);
    expect(percentOfOneCore({ cpuMs: 0, at: 0 }, { cpuMs: 3000, at: 2000 })).toBe(150);
  });

  it('has no value without a previous reading, for a stalled clock, or for a counter that went back', () => {
    expect(percentOfOneCore(undefined, { cpuMs: 10, at: 1 })).toBeUndefined();
    expect(percentOfOneCore({ cpuMs: 0, at: 5 }, { cpuMs: 10, at: 5 })).toBeUndefined();
    expect(percentOfOneCore({ cpuMs: 500, at: 0 }, { cpuMs: 10, at: 1000 })).toBeUndefined();
  });
});

describe('percentOfAllCores', () => {
  it('divides by the core count, so 100 means every core busy', () => {
    expect(percentOfAllCores(150, 4)).toBe(37.5);
    expect(percentOfAllCores(800, 8)).toBe(100);
  });

  it('has no value without a core count, and never passes 100', () => {
    expect(percentOfAllCores(150, undefined)).toBeUndefined();
    expect(percentOfAllCores(150, 0)).toBeUndefined();
    expect(percentOfAllCores(420, 4)).toBe(100);
  });
});

describe('capAtFull', () => {
  it('keeps a thread at or under 100', () => {
    expect(capAtFull(102)).toBe(100);
    expect(capAtFull(37)).toBe(37);
    expect(capAtFull(undefined)).toBeUndefined();
  });
});
