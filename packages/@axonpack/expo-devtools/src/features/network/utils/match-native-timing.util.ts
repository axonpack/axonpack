import type { NetworkLogEntry, NetworkPhases } from '../stores/network-log.store';

/** One completed request as the native stack timed it, before it is attached to a row. */
export type NativeTimingReport = {
  url: string;
  /** Epoch milliseconds, so it can be lined up with a row's own `startedAt`. */
  startMs: number;
  phases: NetworkPhases;
};

/**
 * How far apart the two clocks may be. Generous on purpose: a row's `startedAt` is stamped when the
 * app called `fetch`, the native `fetchStart` when the stack picked the request up, and a busy JS
 * thread can put real distance between them. Closeness only has to break ties between rows for the
 * same URL, so a wide window costs nothing.
 */
const MAX_CLOCK_GAP_MS = 5000;

/**
 * Which row a native report belongs to, or undefined when nothing plausible matches.
 *
 * Matched on URL and time because the platform shares no request id with JavaScript: the native
 * stack knows a task, the patches know a call, and nothing connects the two. So the same URL
 * requested twice at once is genuinely ambiguous, and the tie is broken by whichever row started
 * closest to the native reading. A row that already has phases is skipped, which stops one report
 * landing on a row another already claimed.
 */
export function matchNativeTiming(
  report: NativeTimingReport,
  entries: readonly NetworkLogEntry[]
): NetworkLogEntry | undefined {
  let best: NetworkLogEntry | undefined;
  let bestGap = Number.POSITIVE_INFINITY;

  for (const entry of entries) {
    if (entry.phases !== undefined) continue;
    if (entry.url !== report.url) continue;

    const gap = Math.abs(entry.startedAt - report.startMs);
    if (gap > MAX_CLOCK_GAP_MS) continue;
    if (gap < bestGap) {
      best = entry;
      bestGap = gap;
    }
  }

  return best;
}
