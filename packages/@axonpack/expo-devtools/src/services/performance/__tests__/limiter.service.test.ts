import { blockJsThread, crashJsThread, isMainThreadLimiterAvailable } from '../limiter.service';

describe('limiter', () => {
  it('occupies the JS thread for roughly the requested time', () => {
    const startedAt = Date.now();
    blockJsThread(60);

    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(55);
  });

  it('returns immediately for a non-positive duration', () => {
    const startedAt = Date.now();
    blockJsThread(0);
    expect(Date.now() - startedAt).toBeLessThan(20);
  });

  it('reports the main thread as unavailable without the native module', () => {
    expect(isMainThreadLimiterAvailable()).toBe(false);
  });

  it('throws when crashing the JS thread, in any build', () => {
    expect(() => crashJsThread('boom')).toThrow('boom');
  });
});
