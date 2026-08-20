import {
  adoptPersistedCrash,
  captureCrash,
  configureCrashCapture,
  resetCrashCapture,
  setCrashContext,
} from '../capture-crash.service';
import { crashStore } from '../../stores/crash.store';

const mockPersistCrashRecord = jest.fn();

jest.mock('../native-crash.service', () => ({
  persistCrashRecord: (...args: unknown[]) => mockPersistCrashRecord(...args),
  isNativeCrashCaptureAvailable: () => false,
  installNativeCrashHandler: () => {},
  drainNativeCrashRecords: () => [],
  readNativeDeviceInfo: () => ({}),
}));

beforeEach(() => {
  jest.clearAllMocks();
  resetCrashCapture();
  crashStore.reset();
  crashStore.setEnabled(true);
});

describe('captureCrash', () => {
  it('records an Error with its name, message and stack', () => {
    captureCrash(new TypeError('nope'), 'js-error');

    const [record] = crashStore.getSnapshot();
    expect(record?.name).toBe('TypeError');
    expect(record?.message).toBe('nope');
    expect(record?.stack).toContain('TypeError');
    expect(record?.seen).toBe(false);
  });

  it('records a thrown non-Error rather than dropping it', () => {
    captureCrash('just a string', 'js-error');
    expect(crashStore.getSnapshot()[0]?.message).toBe('just a string');
  });

  it('captures nothing until the store is enabled', () => {
    crashStore.reset();
    expect(captureCrash(new Error('x'), 'js-fatal')).toBeNull();
  });

  it('attaches the context set by the app', () => {
    setCrashContext({ userId: 'u-1' });
    captureCrash(new Error('x'), 'js-error');
    expect(crashStore.getSnapshot()[0]?.context).toEqual({ userId: 'u-1' });
  });

  it('attaches a component stack for a render error', () => {
    captureCrash(new Error('x'), 'react-render', { componentStack: '\n    in Foo' });
    expect(crashStore.getSnapshot()[0]?.componentStack).toBe('\n    in Foo');
  });
});

describe('captureCrash persistence', () => {
  it('persists a fatal record, since the process may not survive to show it', () => {
    captureCrash(new Error('x'), 'js-fatal');
    expect(mockPersistCrashRecord).toHaveBeenCalledTimes(1);
  });

  it('does not persist a non-fatal record by default', () => {
    captureCrash(new Error('x'), 'js-error');
    expect(mockPersistCrashRecord).not.toHaveBeenCalled();
  });

  it('persists a non-fatal record when the app asks for it', () => {
    configureCrashCapture({ persistNonFatal: true });
    captureCrash(new Error('x'), 'js-error');
    expect(mockPersistCrashRecord).toHaveBeenCalledTimes(1);
  });
});

describe('captureCrash redaction', () => {
  it('stores the redacted record, never the original', () => {
    configureCrashCapture({
      redact: (record) => ({ ...record, message: '[redacted]' }),
    });
    captureCrash(new Error('secret token abc'), 'js-error');
    expect(crashStore.getSnapshot()[0]?.message).toBe('[redacted]');
  });

  it('drops the record entirely when redaction returns null, without persisting it', () => {
    configureCrashCapture({ redact: () => null, persistNonFatal: true });
    captureCrash(new Error('x'), 'js-fatal');

    expect(crashStore.getSnapshot()).toEqual([]);
    expect(mockPersistCrashRecord).not.toHaveBeenCalled();
  });
});

describe('captureCrash re-entrancy', () => {
  it('drops a crash raised by the crash hook itself instead of looping', () => {
    configureCrashCapture({
      onCrash: () => {
        captureCrash(new Error('from the hook'), 'js-error');
      },
    });
    captureCrash(new Error('first'), 'js-error');

    expect(crashStore.getSnapshot().map((record) => record.message)).toEqual(['first']);
  });

  it('survives a throwing onCrash hook', () => {
    configureCrashCapture({
      onCrash: () => {
        throw new Error('reporting backend is down');
      },
    });
    expect(() => captureCrash(new Error('x'), 'js-error')).not.toThrow();
    expect(crashStore.getSnapshot()).toHaveLength(1);
  });
});

describe('adoptPersistedCrash', () => {
  it('marks a drained record as coming from a previous launch', () => {
    adoptPersistedCrash({ name: 'NSInvalidArgumentException', message: 'boom' });

    const [record] = crashStore.getSnapshot();
    expect(record?.fromPreviousLaunch).toBe(true);
    expect(record?.kind).toBe('native-exception');
    expect(record?.seen).toBe(false);
  });

  it('fills in defaults for a record written by an older build', () => {
    adoptPersistedCrash({});
    expect(crashStore.getSnapshot()[0]?.name).toBe('Error');
  });
});
