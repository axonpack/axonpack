import type { CpuSample } from '../stores/performance.store';

export type CpuLine = {
  label: string;
  color: string;
  /** Only the readings that were taken. A thread that could not be read is left out, never a 0. */
  values: number[];
  latest?: number;
};

/** The three lines both CPU plots draw, in one place so the in-app card and the DevTools tab agree. */
export function cpuLines(
  samples: CpuSample[],
  colors: { cpuApp: string; cpuJs: string; cpuUi: string }
): CpuLine[] {
  const line = (label: string, color: string, pick: (sample: CpuSample) => number | undefined) => ({
    label,
    color,
    values: samples.map(pick).filter((value): value is number => value !== undefined),
    latest: samples.length > 0 ? pick(samples[samples.length - 1]) : undefined,
  });
  return [
    line('Total', colors.cpuApp, (sample) => sample.total),
    line('JavaScript', colors.cpuJs, (sample) => sample.js),
    line('UI thread', colors.cpuUi, (sample) => sample.main),
  ];
}

/** Every line is a percent that tops out at 100, so the axis never moves. */
export const CPU_DOMAIN_MAX = 100;

/** Shown beside the title; nothing when the phone did not say. */
export function coreCountLabel(samples: CpuSample[]): string | undefined {
  const cores = samples.length > 0 ? samples[samples.length - 1].cores : undefined;
  if (!cores) return undefined;
  return cores === 1 ? '1 core' : `${cores} cores`;
}
