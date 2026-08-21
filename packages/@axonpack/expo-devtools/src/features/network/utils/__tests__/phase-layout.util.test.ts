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

  // The phases never add up to the request: the stack leaves time attributed to no phase at all, so
  // scaling to their sum would stretch them over a request they do not fill.
  it('scales to the platform’s own total when it reported one', () => {
    const rows = layOutPhases({ dnsMs: 25, waitMs: 25, totalMs: 100, measuredBy: MEASURED });

    expect(rows.map((r) => [r.label, r.offsetPercent, r.widthPercent])).toEqual([
      ['DNS', 0, 25],
      ['Waiting', 25, 25],
    ]);
  });

  it('falls back to the phases added up when no total came', () => {
    const rows = layOutPhases({ dnsMs: 25, waitMs: 25, measuredBy: MEASURED });

    expect(rows.map((r) => r.widthPercent)).toEqual([50, 50]);
  });

  // A total smaller than the phases is a clock disagreeing with itself; the phases are what was
  // actually measured, so they win rather than overflowing the track.
  it('ignores a total that is smaller than the phases it contains', () => {
    const rows = layOutPhases({ dnsMs: 40, waitMs: 60, totalMs: 50, measuredBy: MEASURED });

    expect(rows.map((r) => r.widthPercent)).toEqual([40, 60]);
  });

  // So a row always has a total, even against a build of the native side that reports none.
  it('takes the app’s own duration when the platform sent no total', () => {
    const rows = layOutPhases({ dnsMs: 25, waitMs: 25, measuredBy: MEASURED }, 100);

    expect(rows.map((r) => r.widthPercent)).toEqual([25, 25]);
  });

  it('prefers the platform’s total over the app’s', () => {
    const rows = layOutPhases({ dnsMs: 25, waitMs: 25, totalMs: 50, measuredBy: MEASURED }, 200);

    expect(rows.map((r) => r.widthPercent)).toEqual([50, 50]);
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
