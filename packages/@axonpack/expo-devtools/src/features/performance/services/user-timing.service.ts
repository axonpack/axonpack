import { performanceStore } from '../stores/performance.store';

/** Options for `devtools.mark()`. Both optional; `devtools.mark('name')` is the usual call. */
export type MarkOptions = {
  /**
   * Anything worth seeing beside the entry — an id, a route, a count. Strings are shown as they
   * are, everything else as JSON. Nothing is attached by default.
   */
  detail?: unknown;
  /**
   * Place the mark at a time you already have, in `performance.now()` milliseconds. Defaults to
   * now — pass this only when timing something that already happened.
   */
  startTime?: number;
};

/**
 * Options for `devtools.measure()`, for the cases the two-mark form cannot express.
 *
 * Passing `start`, `end` and `duration` together throws, since the three can disagree.
 */
export type MeasureOptions = {
  /** As `MarkOptions.detail`: extra context shown beside the entry. */
  detail?: unknown;
  /**
   * Where the span begins — the name of an earlier mark, or a `performance.now()` timestamp.
   * Defaults to the mark with the same name as the measure.
   */
  start?: string | number;
  /** Where the span ends, as a mark name or a timestamp. Defaults to now. */
  end?: string | number;
  /** The span's length in milliseconds, when you have timed it yourself. */
  duration?: number;
};

const marks = new Map<string, number>();

function nowMs(): number {
  const host = globalThis.performance as unknown as { now?: () => number } | undefined;
  try {
    if (typeof host?.now === 'function') return host.now();
  } catch {}
  return Date.now();
}

function describeDetail(detail: unknown): string | undefined {
  if (detail === undefined || detail === null) return undefined;
  if (typeof detail === 'string') return detail;
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

function forward(call: () => void) {
  try {
    call();
  } catch {}
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

  const startRef = options ? options.start : (startMark ?? name);

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
