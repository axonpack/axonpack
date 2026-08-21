import { installCrashHandlers, resetCrashHandlers } from '../install-crash-handlers.service';
import { crashStore } from '../../stores/crash.store';
import { resetCrashCapture } from '../capture-crash.service';

const mockDrainNativeCrashRecords = jest.fn(() => [] as Record<string, unknown>[]);
const mockInstallNativeCrashHandler = jest.fn();
const mockPersistCrashRecord = jest.fn();

jest.mock('../native-crash.service', () => ({
  persistCrashRecord: (...args: unknown[]) => mockPersistCrashRecord(...args),
  isNativeCrashCaptureAvailable: () => true,
  installNativeCrashHandler: () => mockInstallNativeCrashHandler(),
  drainNativeCrashRecords: () => mockDrainNativeCrashRecords(),
  readNativeDeviceInfo: () => ({}),
}));

type ErrorHandler = (error: unknown, isFatal: boolean) => void;

const ALL_HANDLERS = { jsErrors: true, unhandledRejections: true, nativeExceptions: true };

let previousErrorUtils: unknown;
let previousHermes: unknown;

beforeEach(() => {
  jest.clearAllMocks();
  resetCrashHandlers();
  resetCrashCapture();
  crashStore.reset();
  crashStore.setEnabled(true);

  previousErrorUtils = (globalThis as Record<string, unknown>).ErrorUtils;
  previousHermes = (globalThis as Record<string, unknown>).HermesInternal;
});

afterEach(() => {
  (globalThis as Record<string, unknown>).ErrorUtils = previousErrorUtils;
  (globalThis as Record<string, unknown>).HermesInternal = previousHermes;
});

function installFakeErrorUtils(existing?: ErrorHandler) {
  let handler = existing;
  (globalThis as Record<string, unknown>).ErrorUtils = {
    getGlobalHandler: () => handler,
    setGlobalHandler: (next: ErrorHandler) => {
      handler = next;
    },
  };
  return () => handler;
}

describe('the JS error handler', () => {
  it('captures a fatal error and still calls the handler React Native installed', () => {
    const rnHandler = jest.fn();
    const currentHandler = installFakeErrorUtils(rnHandler);

    installCrashHandlers(ALL_HANDLERS);
    currentHandler()?.(new Error('boom'), true);

    expect(crashStore.getSnapshot()[0]?.kind).toBe('js-fatal');
    expect(rnHandler).toHaveBeenCalledTimes(1);
  });

  it('records a non-fatal error as a non-fatal kind', () => {
    const currentHandler = installFakeErrorUtils(jest.fn());

    installCrashHandlers(ALL_HANDLERS);
    currentHandler()?.(new Error('boom'), false);

    expect(crashStore.getSnapshot()[0]?.kind).toBe('js-error');
  });

  it('withholds a fatal error from React Native when asked to survive it', () => {
    const rnHandler = jest.fn();
    const currentHandler = installFakeErrorUtils(rnHandler);

    installCrashHandlers({ ...ALL_HANDLERS, surviveFatalJsErrors: true });
    currentHandler()?.(new Error('boom'), true);

    expect(crashStore.getSnapshot()[0]?.kind).toBe('js-fatal');
    // Not calling this is the whole mechanism: it is what reports the error to the native side, and
    // that report is what ends the process.
    expect(rnHandler).not.toHaveBeenCalled();
  });

  it('still passes a non-fatal error on while surviving fatal ones', () => {
    const rnHandler = jest.fn();
    const currentHandler = installFakeErrorUtils(rnHandler);

    installCrashHandlers({ ...ALL_HANDLERS, surviveFatalJsErrors: true });
    currentHandler()?.(new Error('boom'), false);

    expect(rnHandler).toHaveBeenCalledTimes(1);
  });

  it('is left alone when the app turns that tier off', () => {
    const rnHandler = jest.fn();
    const currentHandler = installFakeErrorUtils(rnHandler);

    installCrashHandlers({ ...ALL_HANDLERS, jsErrors: false });
    expect(currentHandler()).toBe(rnHandler);
  });
});

describe('the rejection tracker', () => {
  it('captures an unhandled rejection', () => {
    let onUnhandled: ((id: number, rejection: unknown) => void) | undefined;
    (globalThis as Record<string, unknown>).HermesInternal = {
      enablePromiseRejectionTracker: (options: {
        onUnhandled: (id: number, rejection: unknown) => void;
      }) => {
        onUnhandled = options.onUnhandled;
      },
    };
    installFakeErrorUtils();

    installCrashHandlers(ALL_HANDLERS);
    onUnhandled?.(1, new Error('rejected'));

    expect(crashStore.getSnapshot()[0]?.kind).toBe('unhandled-rejection');
  });

  it('wraps a non-Error rejection so the report still has a message', () => {
    let onUnhandled: ((id: number, rejection: unknown) => void) | undefined;
    (globalThis as Record<string, unknown>).HermesInternal = {
      enablePromiseRejectionTracker: (options: {
        onUnhandled: (id: number, rejection: unknown) => void;
      }) => {
        onUnhandled = options.onUnhandled;
      },
    };
    installFakeErrorUtils();

    installCrashHandlers(ALL_HANDLERS);
    onUnhandled?.(2, { code: 401 });

    expect(crashStore.getSnapshot()[0]?.message).toContain('401');
  });
});

describe('previous-launch records', () => {
  it('adopts what the native handler wrote before the process died', () => {
    mockDrainNativeCrashRecords.mockReturnValueOnce([
      { name: 'java.lang.IllegalStateException', message: 'boom' },
    ]);
    installFakeErrorUtils();

    installCrashHandlers(ALL_HANDLERS);

    const [record] = crashStore.getSnapshot();
    expect(record?.fromPreviousLaunch).toBe(true);
    expect(record?.name).toBe('java.lang.IllegalStateException');
  });

  it('drains them even with native capture off, so they are never reported at a random later launch', () => {
    installFakeErrorUtils();
    installCrashHandlers({ ...ALL_HANDLERS, nativeExceptions: false });

    expect(mockInstallNativeCrashHandler).not.toHaveBeenCalled();
    expect(mockDrainNativeCrashRecords).toHaveBeenCalledTimes(1);
  });
});

describe('installation', () => {
  it('installs once per process', () => {
    installFakeErrorUtils();
    installCrashHandlers(ALL_HANDLERS);
    installCrashHandlers(ALL_HANDLERS);

    expect(mockInstallNativeCrashHandler).toHaveBeenCalledTimes(1);
  });
});
