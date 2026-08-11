import { performanceStore } from '../../stores/performance/performance.store';

/**
 * User Timing, recorded through this package's own API instead of observed from the global timeline.
 *
 * Observing was tried and removed: `PerformanceObserver` on `mark`/`measure` also delivers React's
 * internal track measures — hundreds of sub-millisecond entries under names that change between React
 * versions — and recording them fed a loop, because the panel re-rendering is itself work React
 * measures. Recording only what a caller passes has neither problem, and the entry still lands on the
 * platform timeline (see `forward` below) so anything else reading it sees the same thing.
 *
 * Signatures follow the W3C User Timing spec so the calls port both ways:
 * https://www.w3.org/TR/user-timing/
 */

export type MarkOptions = {
  detail?: unknown;
  /** Overrides the mark's own time, as the spec allows. */
  startTime?: number;
};

export type MeasureOptions = {
  detail?: unknown;
  /** A mark name or an explicit timestamp. */
  start?: string | number;
  end?: string | number;
  duration?: number;
};

const marks = new Map<string, number>();

function nowMs(): number {
  const host = globalThis.performance as unknown as { now?: () => number } | undefined;
  try {
    if (typeof host?.now === 'function') return host.now();
  } catch {
    // A runtime without a usable `performance.now` still gets wall-clock timings.
  }
  return Date.now();
}

/** `detail` is `any` per spec; the list renders text, so it's stringified once on the way in. */
function describeDetail(detail: unknown): string | undefined {
  if (detail === undefined || detail === null) return undefined;
  if (typeof detail === 'string') return detail;
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

/**
 * Mirrors the call onto the real `performance` object so the entry exists on the standard timeline
 * too — other tooling, or a later `getEntriesByType`, then sees exactly what this tab shows. Failure
 * is ignored: this is a courtesy, not the record of truth.
 */
function forward(call: () => void) {
  try {
    call();
  } catch {
    // Older runtimes may not implement User Timing at all.
  }
}

export function recordMark(name: string, options?: MarkOptions) {
  const startTime = options?.startTime ?? nowMs();
  marks.set(name, startTime);

  performanceStore.addUserTiming([
    { kind: 'mark', name, startTime, duration: 0, detail: describeDetail(options?.detail) },
  ]);

  const host = globalThis.performance as unknown as
    { mark?: (name: string, options?: MarkOptions) => void } | undefined;
  forward(() => host?.mark?.(name, options));
}

/** A mark name resolves to its recorded time; a number is already a timestamp. */
function resolve(value: string | number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return value;
  return marks.get(value);
}

export function recordMeasure(
  name: string,
  startOrOptions?: string | MeasureOptions,
  endMark?: string
) {
  const options =
    typeof startOrOptions === 'object' && startOrOptions !== null ? startOrOptions : undefined;
  const startMark = typeof startOrOptions === 'string' ? startOrOptions : undefined;
  // `measure('checkout')` closes a mark of the same name — the ergonomic case the spec leaves to you.
  const startRef = options ? options.start : (startMark ?? name);

  // The spec makes all three an error, because they can contradict each other.
  if (options?.start !== undefined && options.end !== undefined && options.duration !== undefined) {
    throw new TypeError(
      'measure() must not be given start, end and duration together — they can disagree.'
    );
  }

  let start = resolve(startRef);
  let end = resolve(options ? options.end : endMark);

  if (options?.duration !== undefined) {
    if (start !== undefined) end = start + options.duration;
    else if (end !== undefined) start = end - options.duration;
  }
  // An open-ended measure runs to now; `measure(name)` with no mark at all measures from the origin,
  // matching the spec's default of the time origin rather than dropping the call.
  end ??= nowMs();
  const resolvedStart = start ?? 0;

  performanceStore.addUserTiming([
    {
      kind: 'measure',
      name,
      startTime: resolvedStart,
      duration: end - resolvedStart,
      detail: describeDetail(options?.detail),
    },
  ]);

  const host = globalThis.performance as unknown as
    | {
        measure?: (
          name: string,
          startOrOptions?: string | MeasureOptions,
          endMark?: string
        ) => void;
      }
    | undefined;
  forward(() => host?.measure?.(name, startOrOptions, endMark));
}

export function clearRecordedMarks(name?: string) {
  if (name === undefined) marks.clear();
  else marks.delete(name);

  performanceStore.clearUserTiming(
    (entry) => entry.kind === 'mark' && (name === undefined || entry.name === name)
  );

  const host = globalThis.performance as unknown as
    { clearMarks?: (name?: string) => void } | undefined;
  forward(() => host?.clearMarks?.(name));
}

export function clearRecordedMeasures(name?: string) {
  performanceStore.clearUserTiming(
    (entry) => entry.kind === 'measure' && (name === undefined || entry.name === name)
  );

  const host = globalThis.performance as unknown as
    { clearMeasures?: (name?: string) => void } | undefined;
  forward(() => host?.clearMeasures?.(name));
}
