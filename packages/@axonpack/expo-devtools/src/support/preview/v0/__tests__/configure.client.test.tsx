import type { PreviewConfig } from '@axonpack/preview';
import type { ReactElement } from 'react';

const CONFIG: PreviewConfig = {
  enabled: true,
  s3Config: { url: 'https://bucket.example.com/previews' },
};

const FAKE_PREVIEW = { PreviewProvider: () => null, PreviewList: () => null };

/** A fresh module registry where `@axonpack/preview` is the fake above at `version`, or missing. */
function load(preview: 'installed' | 'missing', version = '0.2.0') {
  jest.resetModules();
  const ifInstalled = <T,>(module: T) => {
    if (preview === 'missing') throw new Error("Cannot find module '@axonpack/preview'");
    return module;
  };
  jest.doMock('@axonpack/preview/package.json', () => ifInstalled({ version }));
  jest.doMock('@axonpack/preview', () => ifInstalled(FAKE_PREVIEW));
  jest.doMock('../../../../features/crash/services/native-crash.service', () => ({
    persistCrashRecord: () => {},
    isNativeCrashCaptureAvailable: () => false,
    installNativeCrashHandler: () => {},
    drainNativeCrashRecords: () => [],
    readNativeDeviceInfo: () => ({}),
  }));
  // The icon font pulls in expo-asset, which jest can't resolve, and no icon is drawn here.
  jest.doMock('@expo/vector-icons/MaterialIcons', () => () => null);
  jest.doMock('../../../../core/components/devtools-overlay/devtools-overlay.component', () => ({
    DevtoolsOverlay: () => null,
  }));
  // No renderer here: the components are called as functions, so their styles can't be a hook.
  jest.doMock('../../../../core/utils/themed-styles.util', () => ({
    ...jest.requireActual('../../../../core/utils/themed-styles.util'),
    makeThemedStyles: () => () => ({}),
  }));
  return {
    support: require('..') as typeof import('..'),
    ...(require('../configure.client') as typeof import('../configure.client')),
    ...(require('../../../../client/start-devtools.client') as typeof import('../../../../client/start-devtools.client')),
    ...(require('../../../../core/components/devtools-provider.component') as typeof import('../../../../core/components/devtools-provider.component')),
    ...(require('../../../../core/components/devtools-overlay/devtools-tab-bar.component') as typeof import('../../../../core/components/devtools-overlay/devtools-tab-bar.component')),
    ...(require('../../../../core/components/devtools-overlay/support-tab.component') as typeof import('../../../../core/components/devtools-overlay/support-tab.component')),
  };
}

const NO_NETWORK_PATCHES = { http: false };
const tabKeys = (tabs: { key: string }[]) => tabs.map(({ key }) => key);

describe('the module', () => {
  it('gives the same members as a default import and as a namespace', () => {
    const { support } = load('installed');
    expect(support.default.configure).toBe(support.configure);
    expect(Object.keys(support.default)).toEqual(['configure']);
  });

  it('is published as ./support/preview/v0 only', () => {
    const { exports } = jest.requireActual('../../../../../package.json');
    expect(exports['./support/preview/v0']['expo-source']).toBe(
      './src/support/preview/v0/index.ts'
    );
    expect(exports['./support/preview']).toBeUndefined();
  });
});

describe('not configured', () => {
  it('adds no Preview tab and puts nothing around the app', () => {
    const { startDevtools, shownTabs, DevtoolsProvider } = load('installed');
    startDevtools({ network: NO_NETWORK_PATCHES });
    expect(tabKeys(shownTabs({}))).not.toContain('preview');
    const tree = DevtoolsProvider({ config: {}, children: 'app' }) as ReactElement;
    expect(tree.type).not.toBe(FAKE_PREVIEW.PreviewProvider);
  });
});

describe('configured, preview installed', () => {
  it("adds a Preview tab before Crashes, and wraps the app in preview's provider", () => {
    const { configure, shownTabs, DevtoolsProvider } = load('installed');
    const support = configure(CONFIG);
    expect(support.error).toBeUndefined();
    const tabs = tabKeys(shownTabs({}, [support]));
    expect(tabs.indexOf('preview')).toBe(tabs.indexOf('crashes') - 1);

    // With the devtools off too: a preview is a release bundle and has to confirm its start.
    const tree = DevtoolsProvider({
      config: { enabled: false, supports: [support] },
      children: 'app',
    }) as ReactElement;
    expect(tree.type).toBe(support.Provider);
    const inner = (support.Provider as (props: object) => ReactElement)(tree.props as object);
    expect(inner.type).toBe(FAKE_PREVIEW.PreviewProvider);
    expect((inner.props as { config: PreviewConfig }).config).toBe(CONFIG);
  });
});

describe('configured, preview missing', () => {
  it('logs the error, shows it in the tab, and never throws', () => {
    const { configure, startDevtools, SupportTab, PREVIEW_NOT_INSTALLED } = load('missing');
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const support = configure(CONFIG);
    expect(support).toMatchObject({ id: 'preview', error: PREVIEW_NOT_INSTALLED });
    expect(support.Provider).toBeUndefined();

    expect(() => startDevtools({ network: NO_NETWORK_PATCHES, supports: [support] })).not.toThrow();
    expect(error).toHaveBeenCalledWith(PREVIEW_NOT_INSTALLED);
    const tab = SupportTab({ support }) as ReactElement<{ children: string }>;
    expect(tab.props.children).toBe(PREVIEW_NOT_INSTALLED);
    error.mockRestore();
  });
});

describe('configured, preview on another major', () => {
  it('reports it like a missing preview, naming the entry to use', () => {
    const { configure, startDevtools, SupportTab, previewWrongMajor } = load('installed', '1.0.0');
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const support = configure(CONFIG);
    expect(support).toMatchObject({ id: 'preview', error: previewWrongMajor('1.0.0') });
    expect(support.error).toContain('`@axonpack/expo-devtools/support/preview/v1`');
    expect(support.Provider).toBeUndefined();

    expect(() => startDevtools({ network: NO_NETWORK_PATCHES, supports: [support] })).not.toThrow();
    expect(error).toHaveBeenCalledWith(support.error);
    const tab = SupportTab({ support }) as ReactElement<{ children: string }>;
    expect(tab.props.children).toBe(support.error);
    error.mockRestore();
  });

  it('takes a 0.x prerelease as 0.x', () => {
    expect(load('installed', '0.3.0-canary-abc').configure(CONFIG).error).toBeUndefined();
  });
});
