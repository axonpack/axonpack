import { createDevtoolsClient } from '../create-devtools-client.client';
import { BUILT_IN_PALETTES } from '../../core/constants/theme.const';
import {
  captureCrash,
  resetCrashCapture,
} from '../../features/crash/services/capture-crash.service';
import { getCrashPopupDetail } from '../../features/crash/services/crash-popup.service';
import { resetCrashHandlers } from '../../features/crash/services/install-crash-handlers.service';
import { crashStore } from '../../features/crash/stores/crash.store';
import { devtoolsReadyStore } from '../../core/stores/devtools-ready.store';
import { themeStore } from '../../core/stores/theme.store';

jest.mock('../../features/crash/services/native-crash.service', () => ({
  persistCrashRecord: () => {},
  isNativeCrashCaptureAvailable: () => false,
  installNativeCrashHandler: () => {},
  drainNativeCrashRecords: () => [],
  readNativeDeviceInfo: () => ({}),
}));

/** A full `init()` patches XHR, which this environment has no implementation of. */
const NO_NETWORK_PATCHES = { includeFetch: false, includeXmlHttpRequest: false };

beforeEach(() => {
  resetCrashHandlers();
  resetCrashCapture();
  crashStore.reset();
  devtoolsReadyStore.reset();
  themeStore.setDefaultId('light');
});

/**
 * There is one gate in this package and it is `init()`. Not calling it *is* how you turn the
 * devtools off — there is no second flag saying so.
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

  it('stays false when only crash capture ran, so no button appears', () => {
    createDevtoolsClient({ crash: { enableWhileDevtoolsDisabled: true } });

    expect(devtoolsReadyStore.isReady()).toBe(false);
    // ...while crash capture is very much on.
    expect(crashStore.isEnabled()).toBe(true);
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
 * `if (__DEV__) devtools.init()` in a release build has switched them off. Waiting for a call that
 * never comes would make the flag a lie.
 */
describe('enableWhileDevtoolsDisabled', () => {
  it('installs crash capture when the client is built, without init()', () => {
    createDevtoolsClient({ crash: { enableWhileDevtoolsDisabled: true } });
    expect(crashStore.isEnabled()).toBe(true);
  });

  it('leaves capture off at build time without the flag', () => {
    createDevtoolsClient({});
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

describe('which sheet opens', () => {
  it('is the compact one before init(), since no panel is coming', () => {
    createDevtoolsClient({ crash: { enableWhileDevtoolsDisabled: true } });
    expect(getCrashPopupDetail()).toBe('compact');
  });

  it('upgrades to the full sheet once init() arrives', () => {
    const devtools = createDevtoolsClient({
      network: NO_NETWORK_PATCHES,
      crash: { enableWhileDevtoolsDisabled: true },
    });
    expect(getCrashPopupDetail()).toBe('compact');

    devtools.init();
    expect(getCrashPopupDetail()).toBe('full');
  });

  it('can be forced to compact even with the panel up', () => {
    createDevtoolsClient({
      network: NO_NETWORK_PATCHES,
      crash: { popupDetail: 'compact' },
    }).init();

    expect(getCrashPopupDetail()).toBe('compact');
  });

  it('can be forced to full in a build that never calls init()', () => {
    createDevtoolsClient({
      crash: { enableWhileDevtoolsDisabled: true, popupDetail: 'full' },
    });

    expect(getCrashPopupDetail()).toBe('full');
  });
});

/**
 * Without `init()`, the only crash worth putting in front of somebody using the app is one that ends
 * it. The JS tiers report errors the app survived, which is a developer's concern.
 */
describe('which tiers capture without init()', () => {
  beforeEach(() => {
    createDevtoolsClient({ crash: { enableWhileDevtoolsDisabled: true } });
  });

  it('keeps native exceptions', () => {
    captureCrash(new Error('native boom'), 'native-exception');
    expect(crashStore.getSnapshot()).toHaveLength(1);
  });

  it.each(['js-error', 'unhandled-rejection', 'react-render'] as const)('drops %s', (kind) => {
    captureCrash(new Error('boom'), kind);
    expect(crashStore.getSnapshot()).toEqual([]);
  });
});

describe('which tiers capture after init()', () => {
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

/** The factory installs the native tier; `init()` has to be able to add the JS ones on top. */
describe('upgrading from crash-only to a full session', () => {
  it('starts capturing JS errors once init() runs', () => {
    const devtools = createDevtoolsClient({
      network: NO_NETWORK_PATCHES,
      crash: { enableWhileDevtoolsDisabled: true },
    });

    captureCrash(new Error('before'), 'js-error');
    expect(crashStore.getSnapshot()).toEqual([]);

    devtools.init();

    captureCrash(new Error('after'), 'js-error');
    expect(crashStore.getSnapshot()).toHaveLength(1);
  });
});
