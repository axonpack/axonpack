import { layOutPhases } from '../phase-layout.util';
import type { NetworkPhases } from '../../stores/network-log.store';

const MEASURED: NetworkPhases['measuredBy'] = 'urlsession';

describe('layOutPhases', () => {
  it('starts each phase where the one before it ended', () => {
    const rows = layOutPhases({ dnsMs: 25, tcpMs: 25, waitMs: 50, measuredBy: MEASURED });

    expect(rows.map((r) => [r.label, r.offsetPercent, r.widthPercent])).toEqual([
      ['DNS', 0, 25],
      ['TCP', 25, 25],
      ['Waiting', 50, 50],
    ]);
  });

  it('lays the phases out in the order they happen, not the order they arrived', () => {
    const rows = layOutPhases({ waitMs: 10, queuedMs: 10, tlsMs: 10, measuredBy: MEASURED });

    expect(rows.map((r) => r.label)).toEqual(['Queued', 'TLS', 'Waiting']);
  });

  it('leaves out a phase the platform never measured', () => {
    const rows = layOutPhases({ waitMs: 40, downloadMs: 10, measuredBy: MEASURED });

    expect(rows.map((r) => r.label)).toEqual(['Waiting', 'Downloading']);
    // The two together are the whole of what was measured, so they fill the track.
    expect(rows[0]?.widthPercent).toBe(80);
    expect(rows[1]?.offsetPercent).toBe(80);
  });

  // The real shape of a request: a handshake of milliseconds beside a wait of hundreds.
  it('keeps a tiny phase in its place rather than rounding it away', () => {
    const rows = layOutPhases({ sendMs: 0.1, waitMs: 999.9, measuredBy: MEASURED });

    expect(rows[0]?.widthPercent).toBeCloseTo(0.01);
    expect(rows[1]?.offsetPercent).toBeCloseTo(0.01);
    expect(rows[1]?.widthPercent).toBeCloseTo(99.99);
  });

  // The number is what carries the cascade when the bars cannot: on a real request every phase before
  // the wait sits inside the first percent of the track.
  it('reports where each phase began, in milliseconds', () => {
    const rows = layOutPhases({ queuedMs: 0.6, sendMs: 0.5, measuredBy: MEASURED });

    expect(rows.map((r) => [r.label, r.offsetMs, r.value])).toEqual([
      ['Queued', 0, 0.6],
      ['Sending', 0.6, 0.5],
    ]);
  });

  it('has nothing to lay out when nothing was measured', () => {
    expect(layOutPhases({ measuredBy: MEASURED })).toEqual([]);
  });

  // A reused connection reports its phases as absent, so the request is only wait and download.
  it('fills the track from whatever phases did arrive', () => {
    const rows = layOutPhases({ waitMs: 700, downloadMs: 300, measuredBy: MEASURED });

    expect(rows[rows.length - 1]?.offsetPercent + rows[rows.length - 1]?.widthPercent).toBe(100);
  });
});
