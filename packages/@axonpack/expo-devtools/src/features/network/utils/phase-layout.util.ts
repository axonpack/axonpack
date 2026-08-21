import type { NetworkPhases } from '../stores/network-log.store';

/** In the order they happen, which is the only order a waterfall can be read in. */
export const PHASES: { key: keyof NetworkPhases; label: string }[] = [
  { key: 'queuedMs', label: 'Queued' },
  { key: 'dnsMs', label: 'DNS' },
  { key: 'tcpMs', label: 'TCP' },
  { key: 'tlsMs', label: 'TLS' },
  { key: 'sendMs', label: 'Sending' },
  { key: 'waitMs', label: 'Waiting' },
  { key: 'downloadMs', label: 'Downloading' },
];

/** Where each phase starts and how long it ran, as fractions of the whole measured request. */
export function layOutPhases(phases: NetworkPhases) {
  const measured = PHASES.map((phase) => ({
    ...phase,
    value: phases[phase.key] as number | undefined,
  })).filter((phase): phase is { key: keyof NetworkPhases; label: string; value: number } => {
    return typeof phase.value === 'number';
  });

  const total = measured.reduce((sum, phase) => sum + phase.value, 0);

  let elapsed = 0;
  return measured.map((phase) => {
    const offset = elapsed;
    elapsed += phase.value;
    return {
      ...phase,
      // Both as percentages of the total, so every row's track is the same timeline and a phase sits
      // where it actually happened rather than starting again from the left.
      offsetPercent: total > 0 ? (offset / total) * 100 : 0,
      widthPercent: total > 0 ? (phase.value / total) * 100 : 0,
      // Also in milliseconds, because on a real request the wait is most of the total and every phase
      // before it lands inside the first percent of the track — visibly at the left edge, whatever its
      // offset. The number is the only legible form of the cascade at that scale.
      offsetMs: offset,
    };
  });
}
