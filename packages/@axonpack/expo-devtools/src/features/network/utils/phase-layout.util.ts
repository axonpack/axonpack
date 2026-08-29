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

/**
 * Whether anything inside the request was actually measured. A phases object can arrive with every
 * phase absent — a page's own entry reports zeroes for a cross-origin response nobody allowed it to
 * time — and a waterfall of no bars is worse than the two numbers a patch always has, so this is what
 * decides which of the two accounts the Timing tab gives.
 */
export function hasMeasuredPhase(phases: NetworkPhases): boolean {
  return PHASES.some((phase) => typeof phases[phase.key] === 'number');
}

/** Where each phase starts and how long it ran, as fractions of the whole request. */
export function layOutPhases(phases: NetworkPhases, fallbackTotalMs?: number) {
  const measured = PHASES.map((phase) => ({
    ...phase,
    value: phases[phase.key] as number | undefined,
  })).filter((phase): phase is { key: keyof NetworkPhases; label: string; value: number } => {
    return typeof phase.value === 'number';
  });

  const measuredSum = measured.reduce((sum, phase) => sum + phase.value, 0);
  // The platform's own duration first, the app's own as a fallback, and the phases added up when
  // neither is there. Scaling to a real total is what leaves the time the stack attributed to no phase
  // visible as empty track, rather than stretching the phases over a request they do not fill.
  const claimed = phases.totalMs ?? fallbackTotalMs;
  const total = claimed !== undefined && claimed >= measuredSum ? claimed : measuredSum;

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
