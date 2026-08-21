import { computeThrottleDelayMs, computeUploadDelayMs } from '../network-conditions.util';
import type { ThrottleProfile } from '../../constants/throttle-presets.const';

const SLOW: ThrottleProfile = { downloadKbps: 400, uploadKbps: 100, latencyMs: 2000 };

describe('computeUploadDelayMs', () => {
  // 1,000 bytes is 8,000 bits, and 8,000 bits at 100 kbps is 80 ms.
  it('bills a body at the uplink speed', () => {
    expect(computeUploadDelayMs(1000, SLOW)).toBe(80);
  });

  // The download side charges latency once for the round trip; charging it again here would double it.
  it('charges no latency of its own', () => {
    expect(computeUploadDelayMs(1000, { ...SLOW, latencyMs: 5000 })).toBe(80);
  });

  it.each([[undefined], [0]])('has nothing to bill for a body of %p', (size) => {
    expect(computeUploadDelayMs(size, SLOW)).toBe(0);
  });

  it('does not divide by an uplink of zero', () => {
    expect(computeUploadDelayMs(1000, { ...SLOW, uploadKbps: 0 })).toBe(0);
  });

  // The two are not mirror images: a download is held after it arrives and so pays the latency.
  it('is not the same figure as the download delay', () => {
    expect(computeThrottleDelayMs(1000, SLOW)).toBe(2020);
    expect(computeUploadDelayMs(1000, SLOW)).toBe(80);
  });
});
