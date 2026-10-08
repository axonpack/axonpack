/**
 * CPU time one thread has used, in milliseconds, from a `/proc/<pid>/task/<tid>/stat` line.
 *
 * The thread name sits in brackets and may itself hold spaces and brackets, so the name is matched
 * greedily up to the last `) ` rather than split on spaces. utime and stime are fields 14 and 15,
 * counted in clock ticks.
 */
export function parseTaskStatCpuMs(
  line: string | null | undefined,
  clockTicksPerSecond: number | null | undefined
): number | undefined {
  if (!line || !clockTicksPerSecond) return undefined;
  const match = /^(\d+) \((.*)\) (.*)$/s.exec(line.trim());
  if (!match) return undefined;
  // The rest starts at field 3 (state), so utime and stime are at 11 and 12.
  const rest = match[3].split(' ');
  const utime = Number(rest[11]);
  const stime = Number(rest[12]);
  if (!Number.isFinite(utime) || !Number.isFinite(stime)) return undefined;
  return ((utime + stime) / clockTicksPerSecond) * 1000;
}

/**
 * CPU time used between two readings as a percent of one core. One thread can only run on one core, so
 * for a thread this is 0 to 100 (see `capAtFull`); for the whole app it is the input to
 * `percentOfAllCores`.
 */
export function percentOfOneCore(
  previous: { cpuMs: number; at: number } | undefined,
  next: { cpuMs: number; at: number }
): number | undefined {
  if (!previous || next.at <= previous.at) return undefined;
  const used = next.cpuMs - previous.cpuMs;
  // A counter that went backwards belongs to a different thread or process, not a negative load.
  if (used < 0) return undefined;
  return (used / (next.at - previous.at)) * 100;
}

/**
 * Tick rounding (10 ms on Android) can put a fully busy thread a point or two over 100, which no
 * thread can actually be.
 */
export function capAtFull(percent: number | undefined): number | undefined {
  return percent === undefined ? undefined : Math.min(100, percent);
}

/** The whole app as a share of every core the phone has, so 100% means all of them busy. */
export function percentOfAllCores(
  percentOfOneCore: number,
  cores: number | undefined
): number | undefined {
  if (!cores || cores < 1) return undefined;
  return capAtFull(percentOfOneCore / cores);
}
