import type { NetworkLogEntry } from '../../stores/network-log.store';
import { layOutOverview, OVERVIEW_ROWS } from '../overview-layout.util';

function request(id: string, startedAt: number, duration?: number, ttfb?: number): NetworkLogEntry {
  return {
    kind: 'http',
    id,
    method: 'GET',
    url: 'https://a.test',
    status: 'success',
    startedAt,
    duration,
    ttfb,
  };
}

describe('layOutOverview', () => {
  it('draws nothing for an empty log', () => {
    expect(layOutOverview([])).toBeNull();
  });

  it('grows the scale in 1.25x steps past the last request', () => {
    const layout = layOutOverview([request('a', 1000, 900)])!;
    expect(layout.start).toBe(1000);
    expect(layout.span).toBeGreaterThanOrEqual(900);
    expect(layout.span).toBeLessThan(900 * 1.25);
  });

  it('puts overlapping requests on separate rows and reuses a row once it is free', () => {
    const { bars } = layOutOverview([
      request('a', 0, 100),
      request('b', 50, 100),
      request('c', 200, 10),
    ])!;
    const row = (id: string) => bars.find((bar) => bar.id === id)!.row;
    expect(row('a')).not.toBe(row('b'));
    expect(row('c')).toBe(row('a'));
  });

  it('never uses more rows than the overview has', () => {
    const entries = Array.from({ length: 40 }, (_, index) => request(String(index), index, 1000));
    const { bars } = layOutOverview(entries)!;
    expect(Math.max(...bars.map((bar) => bar.row))).toBeLessThan(OVERVIEW_ROWS);
  });

  it('runs a pending request to the end of the scale and splits a finished one at its first byte', () => {
    const layout = layOutOverview([request('done', 0, 400, 100), request('open', 100)])!;
    const done = layout.bars.find((bar) => bar.id === 'done')!;
    const open = layout.bars.find((bar) => bar.id === 'open')!;
    expect(done.firstByteAt).toBe(100);
    expect(open.pending).toBe(true);
    expect(open.end).toBe(layout.start + layout.span);
  });

  it('labels dividers at round steps inside the span', () => {
    const { ticks, span } = layOutOverview([request('a', 0, 1000)])!;
    expect(ticks.length).toBeGreaterThan(2);
    expect(ticks.every((tick) => tick < span)).toBe(true);
    expect(ticks[0]).toBe(200);
  });
});
