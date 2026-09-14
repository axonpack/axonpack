import { resetDevtoolsStart, startDevtools } from '../start-devtools.client';
import { BUILT_IN_THEMES } from '../../core/constants/theme.const';
import { devtoolsReadyStore } from '../../core/stores/devtools-ready.store';
import { themeStore } from '../../core/stores/theme.store';
import {
  captureCrash,
  resetCrashCapture,
} from '../../features/crash/services/capture-crash.service';
import { getCrashPopupDetail } from '../../features/crash/services/crash-popup.service';
import { resetCrashHandlers } from '../../features/crash/services/install-crash-handlers.service';
import { crashStore } from '../../features/crash/stores/crash.store';

jest.mock('../../features/crash/services/native-crash.service', () => ({
  persistCrashRecord: () => {},
  isNativeCrashCaptureAvailable: () => false,
  installNativeCrashHandler: () => {},
  drainNativeCrashRecords: () => [],
  readNativeDeviceInfo: () => ({}),
}));

/** A full start patches XHR, which this environment has no implementation of. */
const NO_NETWORK_PATCHES = { http: false };

/** What a release build passes: off, but still reporting the crashes that end the app. */
const CRASH_ONLY = {
  enabled: false,
  crash: { enableWhileDevtoolsDisabled: true },
};

beforeEach(() => {
  resetDevtoolsStart();
  resetCrashHandlers();
  resetCrashCapture();
  crashStore.reset();
  devtoolsReadyStore.reset();
  themeStore.setDefaultId('light');
});

/**
 * There is one gate in this package and it is `enabled`. Everything in here hangs off whether the
 * provider's start call got past it.
 */
describe('devtools readiness', () => {
  it('flips once the start has brought the panel up', () => {
    startDevtools({ network: NO_NETWORK_PATCHES });
    expect(devtoolsReadyStore.isReady()).toBe(true);
  });

  it('notifies the overlay when it flips', () => {
    const listener = jest.fn();
    const unsubscribe = devtoolsReadyStore.subscribe(listener);

    startDevtools({ network: NO_NETWORK_PATCHES });

    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it('stays false when only crash capture ran, so no button appears', () => {
    startDevtools(CRASH_ONLY);

    expect(devtoolsReadyStore.isReady()).toBe(false);
    // ...while crash capture is very much on.
    expect(crashStore.isEnabled()).toBe(true);
  });
});

/** `enabled: false` is a release build. The provider still mounts; almost nothing may come of it. */
describe('enabled: false', () => {
  it('starts nothing, so there is no panel and no button', () => {
    startDevtools({ enabled: false });

    expect(devtoolsReadyStore.isReady()).toBe(false);
    expect(crashStore.isEnabled()).toBe(false);
  });

  it('still honours defaultTheme, since the crash sheet reads it', () => {
    startDevtools({ ...CRASH_ONLY, defaultTheme: 'dracula' });
    expect(themeStore.getPalette()).toBe(BUILT_IN_THEMES.dracula.palette);
  });
});

/**
 * A re-render, a remount or a second provider must not patch anything twice, and the config is read
 * by whichever call got there first.
 */
describe('starting twice', () => {
  it('is a no-op the second time', () => {
    const listener = jest.fn();

    startDevtools({ network: NO_NETWORK_PATCHES });
    const unsubscribe = devtoolsReadyStore.subscribe(listener);
    startDevtools({ network: NO_NETWORK_PATCHES });

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('cannot be turned on by a later call', () => {
    startDevtools({ enabled: false });
    startDevtools({ network: NO_NETWORK_PATCHES });

    expect(devtoolsReadyStore.isReady()).toBe(false);
  });
});

/**
 * The flag's promise is that crash capture survives the devtools being off — and an app doing
 * `enabled: __DEV__` in a release build has switched them off. Honouring it only when they are on
 * would make the flag a lie.
 */
describe('enableWhileDevtoolsDisabled', () => {
  it('installs crash capture with the devtools off', () => {
    startDevtools(CRASH_ONLY);
    expect(crashStore.isEnabled()).toBe(true);
  });

  it('leaves capture off without the flag', () => {
    startDevtools({ enabled: false });
    expect(crashStore.isEnabled()).toBe(false);
  });
});

describe('which sheet opens', () => {
  it('is the compact one with the devtools off, since no panel is coming', () => {
    startDevtools(CRASH_ONLY);
    expect(getCrashPopupDetail()).toBe('compact');
  });

  it('is the full one when the panel is up', () => {
    startDevtools({ network: NO_NETWORK_PATCHES });
    expect(getCrashPopupDetail()).toBe('full');
  });

  it('can be forced to compact even with the panel up', () => {
    startDevtools({
      network: NO_NETWORK_PATCHES,
      crash: { popupDetail: 'compact' },
    });

    expect(getCrashPopupDetail()).toBe('compact');
  });

  it('can be forced to full in a build that has the devtools off', () => {
    startDevtools({
      enabled: false,
      crash: { enableWhileDevtoolsDisabled: true, popupDetail: 'full' },
    });

    expect(getCrashPopupDetail()).toBe('full');
  });
});

/**
 * With the devtools off, the only crash worth putting in front of somebody using the app is one that
 * ends it. The JS tiers report errors the app survived, which is a developer's concern.
 */
describe('which tiers capture with the devtools off', () => {
  beforeEach(() => {
    startDevtools(CRASH_ONLY);
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

describe('which tiers capture with them on', () => {
  beforeEach(() => {
    startDevtools({ network: NO_NETWORK_PATCHES });
  });

  it.each(['js-error', 'unhandled-rejection', 'react-render', 'native-exception'] as const)(
    'keeps %s',
    (kind) => {
      captureCrash(new Error('boom'), kind);
      expect(crashStore.getSnapshot()).toHaveLength(1);
    }
  );
});
