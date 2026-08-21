import { applyNativeTiming } from '../native-timing.service';
import { networkLogStore } from '../../stores/network-log.store';

function logRequest(url: string, startedAt: number) {
  networkLogStore.add({ id: `r-${startedAt}`, method: 'GET', url, status: 'pending', startedAt });
}

describe('applyNativeTiming', () => {
  beforeAll(() => networkLogStore.setEnabled(true));
  beforeEach(() => networkLogStore.clear());

  it('attaches the phases the platform reported to the row they belong to', () => {
    logRequest('https://example.test/a', 1000);

    applyNativeTiming({
      url: 'https://example.test/a',
      startMs: 1000,
      queuedMs: 3,
      dnsMs: 12,
      tcpMs: 30,
      tlsMs: 55,
      sendMs: 1,
      waitMs: 120,
      downloadMs: 8,
      reusedConnection: false,
      protocol: 'h2',
      measuredBy: 'urlsession',
    });

    expect(networkLogStore.getSnapshot()[0]?.phases).toEqual({
      queuedMs: 3,
      dnsMs: 12,
      tcpMs: 30,
      tlsMs: 55,
      sendMs: 1,
      waitMs: 120,
      downloadMs: 8,
      reusedConnection: false,
      protocol: 'h2',
      measuredBy: 'urlsession',
    });
  });

  // A reused connection has no DNS, TCP or TLS phase at all, and saying so is the point — three
  // zeroes would read as a handshake that took no time.
  it('leaves a phase the platform did not report absent rather than zero', () => {
    logRequest('https://example.test/reused', 2000);

    applyNativeTiming({
      url: 'https://example.test/reused',
      startMs: 2000,
      dnsMs: null,
      tcpMs: null,
      tlsMs: null,
      waitMs: 40,
      reusedConnection: true,
      measuredBy: 'okhttp',
    });

    const phases = networkLogStore.getSnapshot()[0]?.phases;
    expect(phases?.dnsMs).toBeUndefined();
    expect(phases?.tcpMs).toBeUndefined();
    expect(phases?.reusedConnection).toBe(true);
    expect(phases?.waitMs).toBe(40);
  });

  // The stack reports every request the process makes, including ones from before recording started.
  it('drops a reading that matches no row', () => {
    applyNativeTiming({
      url: 'https://example.test/unlogged',
      startMs: 3000,
      waitMs: 10,
      measuredBy: 'urlsession',
    });

    expect(networkLogStore.getSnapshot()).toHaveLength(0);
  });

  it('gives two concurrent requests to one URL a reading each', () => {
    logRequest('https://example.test/same', 1000);
    logRequest('https://example.test/same', 1200);

    applyNativeTiming({
      url: 'https://example.test/same',
      startMs: 1205,
      waitMs: 20,
      measuredBy: 'urlsession',
    });
    applyNativeTiming({
      url: 'https://example.test/same',
      startMs: 1002,
      waitMs: 90,
      measuredBy: 'urlsession',
    });

    const byId = new Map(networkLogStore.getSnapshot().map((e) => [e.id, e.phases?.waitMs]));
    expect(byId.get('r-1200')).toBe(20);
    expect(byId.get('r-1000')).toBe(90);
  });
});
