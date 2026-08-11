import { blockJsThread, crashJsThread, isMainThreadLimiterAvailable } from '../limiter.service';

describe('limiter', () => {
  it('occupies the JS thread for roughly the requested time', () => {
    const startedAt = Date.now();
    blockJsThread(60);
    // Busy-wait, so it cannot finish early. The upper bound is loose: a CI box may descheduleus.
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(55);
  });

  it('returns immediately for a non-positive duration', () => {
    const startedAt = Date.now();
    blockJsThread(0);
    expect(Date.now() - startedAt).toBeLessThan(20);
  });

  /** No native module under test, which is the same situation as an app running in Expo Go. */
  it('reports the main thread as unavailable without the native module', () => {
    expect(isMainThreadLimiterAvailable()).toBe(false);
  });

  /** Not gated on `__DEV__` — guarding the `.init()` call is what keeps the panel out of a release. */
  it('throws when crashing the JS thread, in any build', () => {
    expect(() => crashJsThread('boom')).toThrow('boom');
  });
});
