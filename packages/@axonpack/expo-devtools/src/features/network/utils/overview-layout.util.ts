import type { NetworkEntry } from '../stores/network-log.store';

export type TimeRange = { start: number; end: number };

export function startedInRange(entry: NetworkEntry, range: TimeRange | null): boolean {
  return range === null || (entry.startedAt >= range.start && entry.startedAt <= range.end);
}

/**
 * Chrome's overview is 60px of 3px bands. Ours keeps the top 16px clear for the time labels, which
 * leaves room for 14.
 */
export const OVERVIEW_ROWS = 14;

export type OverviewBar = {
  id: string;
  row: number;
  start: number;
  /** Where the bar stops. A request still in flight runs to the end of the scale. */
  end: number;
  /** When the first byte came back. Absent means there is no split to draw. */
  firstByteAt?: number;
  pending: boolean;
};

export type OverviewLayout = {
  start: number;
  span: number;
  bars: OverviewBar[];
  /** Offsets from `start`, in milliseconds, for the labelled dividers. */
  ticks: number[];
};

/** 1, 2 or 5 times a power of ten, so the labels read as round numbers. */
function tickStep(span: number): number {
  const raw = span / 6;
  const power = 10 ** Math.floor(Math.log10(raw));
  return ([1, 2, 5, 10].find((multiple) => multiple * power >= raw) ?? 10) * power;
}

/**
 * Chrome's overview, laid out rather than drawn: a tab has no canvas, so each bar is a box placed by
 * percentage. Chrome puts requests on one connection in one band. There are no connection ids here,
 * so a request takes the first band that is free by the time it starts.
 */
export function layOutOverview(entries: readonly NetworkEntry[]): OverviewLayout | null {
  if (entries.length === 0) return null;

  const sorted = [...entries].sort((a, b) => a.startedAt - b.startedAt);
  const start = sorted[0].startedAt;
  const lastKnown = Math.max(...sorted.map((entry) => entry.startedAt + (entry.duration ?? 0)));
  // Grows in steps of 1.25x, as Chrome's does, so the scale holds still while requests trickle in.
  const span = 1.25 ** Math.ceil(Math.log(Math.max(lastKnown - start, 1)) / Math.log(1.25));

  const rowEnds: number[] = [];
  const bars = sorted.map((entry): OverviewBar => {
    const pending = entry.duration === undefined;
    const end = pending ? start + span : entry.startedAt + entry.duration!;
    let row = rowEnds.findIndex((rowEnd) => rowEnd <= entry.startedAt);
    if (row === -1) {
      // All bands busy: share the one that frees up first, the way Chrome wraps its bands.
      row = rowEnds.length < OVERVIEW_ROWS ? rowEnds.length : rowEnds.indexOf(Math.min(...rowEnds));
    }
    rowEnds[row] = Math.max(rowEnds[row] ?? 0, end);

    return {
      id: entry.id,
      row,
      start: entry.startedAt,
      end,
      firstByteAt:
        entry.kind === 'http' && entry.ttfb !== undefined
          ? entry.startedAt + entry.ttfb
          : undefined,
      pending,
    };
  });

  const step = tickStep(span);
  const ticks: number[] = [];
  for (let tick = step; tick < span; tick += step) ticks.push(tick);

  return { start, span, bars, ticks };
}
