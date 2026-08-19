type RestartService = typeof import('../restart-app.service');

/**
 * The module reads its native module once, at import. `doMock` rather than `jest.mock` because the
 * latter is hoisted above the value it would need to capture.
 */
function loadWith(nativeModule: { restartApp?: () => void } | null): RestartService {
  jest.resetModules();
  jest.doMock('expo', () => ({
    ...jest.requireActual('expo'),
    requireOptionalNativeModule: () => nativeModule,
  }));
  return require('../restart-app.service');
}

afterEach(() => {
  jest.dontMock('expo');
  jest.resetModules();
});

describe('canRestartApp', () => {
  /**
   * The Swift module deliberately has no `restartApp` — iOS offers no supported way to relaunch an
   * app — so this is how the crash sheet learns to offer Close instead of a button that cannot work.
   */
  it('is false when the platform does not implement it', () => {
    expect(loadWith({}).canRestartApp()).toBe(false);
  });

  it('is false without a dev build, where there is no native module at all', () => {
    expect(loadWith(null).canRestartApp()).toBe(false);
  });

  it('is true once the native side offers the function', () => {
    expect(loadWith({ restartApp: () => {} }).canRestartApp()).toBe(true);
  });
});

describe('restartApp', () => {
  it('calls through to the native module', () => {
    const spy = jest.fn();
    loadWith({ restartApp: spy }).restartApp();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does nothing where it is unavailable, rather than throwing', () => {
    expect(() => loadWith({}).restartApp()).not.toThrow();
  });

  it('swallows a native failure — a crash reporter must not crash', () => {
    const service = loadWith({
      restartApp: () => {
        throw new Error('activity was gone');
      },
    });
    expect(() => service.restartApp()).not.toThrow();
  });
});
