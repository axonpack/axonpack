import { crashStore } from '../../stores/crash.store';
import { resetCrashCapture } from '../capture-crash.service';
import {
  drainOnce,
  installCrashHandlers,
  resetCrashHandlers,
} from '../install-crash-handlers.service';

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

const ALL_HANDLERS = {
  jsErrors: true,
  unhandledRejections: true,
  nativeExceptions: true,
};

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
  it('captures a fatal error and hands it on, so it ends the app and other reporters see it', () => {
    const rnHandler = jest.fn();
    const currentHandler = installFakeErrorUtils(rnHandler);

    installCrashHandlers(ALL_HANDLERS);
    const error = new Error('boom');
    currentHandler()?.(error, true);

    // Recorded here first, then passed on: that handler reports the error to the native side, and
    // that report is what ends the process.
    expect(crashStore.getSnapshot()[0]?.kind).toBe('js-fatal');
    expect(rnHandler).toHaveBeenCalledWith(error, true);
  });

  it('records a non-fatal error as a non-fatal kind', () => {
    const currentHandler = installFakeErrorUtils(jest.fn());

    installCrashHandlers(ALL_HANDLERS);
    currentHandler()?.(new Error('boom'), false);

    expect(crashStore.getSnapshot()[0]?.kind).toBe('js-error');
  });

  it('passes a non-fatal error on, which only ever gets logged', () => {
    const rnHandler = jest.fn();
    const currentHandler = installFakeErrorUtils(rnHandler);

    installCrashHandlers(ALL_HANDLERS);
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
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

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

  // Ours displaces React Native's tracker, and that tracker is what feeds LogBox in development.
  it('re-emits through console.error, so LogBox still shows a rejection in development', () => {
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
    const rejection = new Error('rejected');
    onUnhandled?.(3, rejection);

    expect(consoleError).toHaveBeenCalledWith(rejection);
  });
});

describe('previous-launch records', () => {
  it('adopts what the native handler wrote before the process died', () => {
    mockDrainNativeCrashRecords.mockReturnValueOnce([
      { name: 'java.lang.IllegalStateException', message: 'boom' },
    ]);
    installFakeErrorUtils();

    installCrashHandlers(ALL_HANDLERS);
    drainOnce();

    const [record] = crashStore.getSnapshot();
    expect(record?.fromPreviousLaunch).toBe(true);
    expect(record?.name).toBe('java.lang.IllegalStateException');
  });

  it('drains them even with native capture off, so they are never reported at a random later launch', () => {
    installFakeErrorUtils();
    installCrashHandlers({ ...ALL_HANDLERS, nativeExceptions: false });
    drainOnce();

    expect(mockInstallNativeCrashHandler).not.toHaveBeenCalled();
    expect(mockDrainNativeCrashRecords).toHaveBeenCalledTimes(1);
  });

  // Whoever asks first drains, and only once: the client asks from two places, because a build with
  // no panel never reaches the one that waits for the console to start recording.
  it('drains once however many times it is asked', () => {
    installFakeErrorUtils();
    drainOnce();
    drainOnce();

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
