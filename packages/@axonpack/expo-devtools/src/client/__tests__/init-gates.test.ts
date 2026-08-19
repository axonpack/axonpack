import { createDevtoolsClient } from '../create-devtools-client.client';
import { captureCrash, resetCrashCapture } from '../../services/crash/capture-crash.service';
import { getCrashPopupDetail } from '../../services/crash/crash-popup.service';
import { resetCrashHandlers } from '../../services/crash/install-crash-handlers.service';
import { crashStore } from '../../stores/crash/crash.store';
import { devtoolsReadyStore } from '../../stores/devtools-ready.store';
import { themeStore } from '../../stores/theme.store';
import { BUILT_IN_PALETTES } from '../../constants/theme.const';

jest.mock('../../services/crash/native-crash.service', () => ({
  persistCrashRecord: () => {},
  isNativeCrashCaptureAvailable: () => false,
  installNativeCrashHandler: () => {},
  drainNativeCrashRecords: () => [],
  readNativeDeviceInfo: () => ({}),
}));

/** A fully enabled `init()` patches XHR, which this environment has no implementation of. */
const NO_NETWORK_PATCHES = { includeFetch: false, includeXmlHttpRequest: false };

beforeEach(() => {
  resetCrashHandlers();
  resetCrashCapture();
  crashStore.reset();
  devtoolsReadyStore.reset();
  themeStore.setDefaultId('light');
});

/**
 * The launcher button reads this, so it is what makes an unguarded `<DevtoolsOverlay />` harmless in
 * a release build rather than a reachable panel.
 */
describe('devtools readiness', () => {
  it('is false until init() runs', () => {
    createDevtoolsClient({ network: NO_NETWORK_PATCHES });
    expect(devtoolsReadyStore.isReady()).toBe(false);
  });

  it('flips once init() has brought the panel up', () => {
    createDevtoolsClient({ network: NO_NETWORK_PATCHES }).init();
    expect(devtoolsReadyStore.isReady()).toBe(true);
  });

  it('stays false when only crash capture survives, so no button appears', () => {
    createDevtoolsClient({
      enabled: false,
      crash: { enableWhileDevtoolsDisabled: true },
    }).init();

    expect(devtoolsReadyStore.isReady()).toBe(false);
    // ...while crash capture is very much on.
    expect(crashStore.isEnabled()).toBe(true);
  });

  it('stays false when init() is never called at all', () => {
    createDevtoolsClient({ enabled: false, crash: { enableWhileDevtoolsDisabled: true } });
    expect(devtoolsReadyStore.isReady()).toBe(false);
  });

  it('notifies the overlay when it flips', () => {
    const listener = jest.fn();
    const unsubscribe = devtoolsReadyStore.subscribe(listener);

    createDevtoolsClient({ network: NO_NETWORK_PATCHES }).init();

    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });
});

/**
 * The flag's promise is that crash capture survives the devtools being off — and an app doing
 * `if (__DEV__) devtools.init()` in a release build has switched them off just as surely as
 * `enabled: false` does. Waiting for `init()` here would make the flag a lie.
 */
describe('enableWhileDevtoolsDisabled', () => {
  it('installs crash capture when the client is built, without init()', () => {
    createDevtoolsClient({ enabled: false, crash: { enableWhileDevtoolsDisabled: true } });
    expect(crashStore.isEnabled()).toBe(true);
  });

  it('takes the compact sheet, since no panel is coming', () => {
    createDevtoolsClient({ enabled: false, crash: { enableWhileDevtoolsDisabled: true } });
    expect(getCrashPopupDetail()).toBe('compact');
  });

  it('upgrades to the full sheet if init() does arrive with the devtools on', () => {
    const devtools = createDevtoolsClient({
      network: NO_NETWORK_PATCHES,
      crash: { enableWhileDevtoolsDisabled: true },
    });
    expect(getCrashPopupDetail()).toBe('compact');

    devtools.init();
    expect(getCrashPopupDetail()).toBe('full');
  });

  it('leaves capture off at build time without the flag', () => {
    createDevtoolsClient({ enabled: false, crash: { enableWhileDevtoolsDisabled: false } });
    expect(crashStore.isEnabled()).toBe(false);
  });

  it('honours defaultTheme without init(), since the crash sheet reads it', () => {
    createDevtoolsClient({
      defaultTheme: 'dracula',
      crash: { enableWhileDevtoolsDisabled: true },
    });
    expect(themeStore.getPalette()).toBe(BUILT_IN_PALETTES.dracula);
  });
});

/**
 * `popupDetail: 'auto'` is the whole point of the option — a release build that ships crash capture
 * without the panel must not put a five-tab debugger in front of somebody using the app.
 */
describe("popupDetail 'auto'", () => {
  it('picks the full sheet when the devtools are enabled', () => {
    createDevtoolsClient({ enabled: true, network: NO_NETWORK_PATCHES }).init();
    expect(getCrashPopupDetail()).toBe('full');
  });

  it('picks the compact sheet when only crash reporting survives', () => {
    createDevtoolsClient({
      enabled: false,
      crash: { enableWhileDevtoolsDisabled: true },
    }).init();

    expect(getCrashPopupDetail()).toBe('compact');
  });
});

describe('an explicit popupDetail', () => {
  it('keeps the full sheet in a build that ships no panel', () => {
    createDevtoolsClient({
      enabled: false,
      crash: { enableWhileDevtoolsDisabled: true, popupDetail: 'full' },
    }).init();

    expect(getCrashPopupDetail()).toBe('full');
  });

  it('forces the compact sheet even with the devtools on', () => {
    createDevtoolsClient({
      enabled: true,
      network: NO_NETWORK_PATCHES,
      crash: { popupDetail: 'compact' },
    }).init();

    expect(getCrashPopupDetail()).toBe('compact');
  });
});

/**
 * The production shape: once the devtools are off, the only crash worth putting in front of somebody
 * using the app is one that ends it. The JS tiers report errors the app survived, which is a
 * developer's concern.
 */
describe('which tiers capture once the devtools are off', () => {
  beforeEach(() => {
    createDevtoolsClient({
      enabled: false,
      crash: { enableWhileDevtoolsDisabled: true },
    }).init();
  });

  it('keeps native exceptions', () => {
    captureCrash(new Error('native boom'), 'native-exception');
    expect(crashStore.getSnapshot()).toHaveLength(1);
  });

  it('drops non-fatal JS errors', () => {
    captureCrash(new Error('survived'), 'js-error');
    expect(crashStore.getSnapshot()).toEqual([]);
  });

  it('drops unhandled rejections', () => {
    captureCrash(new Error('rejected'), 'unhandled-rejection');
    expect(crashStore.getSnapshot()).toEqual([]);
  });

  /** The boundary is a component the app mounts, so it reaches `captureCrash` directly. */
  it('drops render errors from DevtoolsErrorBoundary', () => {
    captureCrash(new Error('render'), 'react-render', { componentStack: '\n    in Foo' });
    expect(crashStore.getSnapshot()).toEqual([]);
  });
});

describe('which tiers capture with the devtools on', () => {
  beforeEach(() => {
    createDevtoolsClient({ network: NO_NETWORK_PATCHES }).init();
  });

  it.each(['js-error', 'unhandled-rejection', 'react-render', 'native-exception'] as const)(
    'keeps %s',
    (kind) => {
      captureCrash(new Error('boom'), kind);
      expect(crashStore.getSnapshot()).toHaveLength(1);
    }
  );
});
