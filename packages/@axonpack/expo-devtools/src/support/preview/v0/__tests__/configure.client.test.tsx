import type { PreviewConfig } from '@axonpack/preview';
import type { ReactElement } from 'react';

const CONFIG: PreviewConfig = {
  enabled: true,
  s3Config: { url: 'https://bucket.example.com/previews' },
};

const STATUS = { title: 'Default', bundleKind: 'built-in', canGoBack: false };
const ITEMS = [
  { id: 'pr-7', status: 'downloaded', active: false, local: {}, entry: { title: 'Dark mode' } },
];
const SERVERS = [{ hostPort: 'localhost:8082', compatible: true }];

const FAKE_PREVIEW = {
  PreviewProvider: () => null,
  PreviewList: () => null,
  usePreviewStatus: () => STATUS,
  usePreview: () => ({ items: ITEMS }),
  useDevPreviewServersState: () => ({ servers: SERVERS }),
  sameServer: () => false,
  previewsStore: {
    switchTo: jest.fn(),
    remove: jest.fn(async () => {}),
    getState: () => ({ activeId: null, error: null }),
  },
  devPreviewServersStore: { switchTo: jest.fn() },
};

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
    ...(require('../stores/preview-support.store') as typeof import('../stores/preview-support.store')),
    ...(require('../components/preview-store-feed.component') as typeof import('../components/preview-store-feed.component')),
    ...(require('../../../../devtools-remote-tab/components/support-panel.component') as typeof import('../../../../devtools-remote-tab/components/support-panel.component')),
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
    expect(support.default.useSupport).toBe(support.useSupport);
    expect(Object.keys(support.default)).toEqual(['configure', 'useSupport']);
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

  it('adds the preview topic and the prompt entry', () => {
    const support = load('installed').configure(CONFIG);
    expect(support.topic?.name).toBe('preview');
    expect(Object.keys(support.context ?? {})).toEqual(['preview']);
  });
});

describe('the store', () => {
  it('is what useSupport reads, fed from preview inside its provider', () => {
    const { configure, useSupport, previewSupportStore, PreviewStoreFeed } = load('installed');
    expect(useSupport).toBe(previewSupportStore.useStore);
    expect(previewSupportStore.getState()).toEqual({ status: null, previews: [], servers: [] });

    const support = configure(CONFIG);
    const inner = (support.Provider as (props: object) => ReactElement)({ children: 'app' });
    const [feed] = (inner.props as { children: ReactElement[] }).children;
    expect(feed.type).toBe(PreviewStoreFeed);
    // No renderer here: run the feed's effect as it is declared.
    const effect = jest
      .spyOn(require('react'), 'useEffect')
      .mockImplementation((run) => (run as () => void)());
    PreviewStoreFeed(feed.props as { preview: never });
    effect.mockRestore();
    expect(previewSupportStore.getState()).toEqual({
      status: STATUS,
      previews: ITEMS,
      servers: SERVERS,
    });
  });

  it("is fed in the DevTools panel too, which gets its own provider around the tab's list", () => {
    const { configure, SupportPanel, PreviewStoreFeed } = load('installed');
    const support = configure(CONFIG);
    const panel = SupportPanel({ support }) as ReactElement<{ children: ReactElement }>;
    expect(panel.type).toBe(support.Provider);
    expect(panel.props.children.type).toBe(support.Panel);
    const inner = (support.Provider as (props: object) => ReactElement)(panel.props);
    expect((inner.props as { children: ReactElement[] }).children[0].type).toBe(PreviewStoreFeed);
  });
});

describe('the prompt entry', () => {
  it("reads the store, and runs the topic's actions without --yes", () => {
    jest.useFakeTimers();
    const { configure, previewSupportStore } = load('installed');
    const { preview } = configure(CONFIG).context as {
      preview: { status: unknown; switch: (id: string) => string; default: () => string };
    };
    previewSupportStore.setState({ status: STATUS as never, previews: ITEMS as never });
    expect(preview.status).toBe(STATUS);
    expect(preview.switch('pr-7')).toBe('# preview · restarting the app on pr-7');
    expect(preview.default()).toBe('error: the default bundle runs now');
    jest.runAllTimers();
    expect(FAKE_PREVIEW.previewsStore.switchTo).toHaveBeenCalledWith(CONFIG, 'pr-7');
    jest.useRealTimers();
  });

  it("has the list's download, update and delete, answering a promise for one that waits", async () => {
    const { configure, previewSupportStore } = load('installed');
    const { preview } = configure(CONFIG).context as {
      preview: Record<'download' | 'update' | 'delete', (id: string) => string | Promise<string>>;
    };
    previewSupportStore.setState({ status: STATUS as never, previews: ITEMS as never });
    expect(preview.download('pr-7')).toBe(
      'error: pr-7 is downloaded. Only an available preview downloads'
    );
    expect(preview.update('pr-7')).toBe('error: pr-7 has no update. It is downloaded');
    expect(await preview.delete('pr-7')).toBe('# preview · deleted pr-7');
    expect(FAKE_PREVIEW.previewsStore.remove).toHaveBeenCalledWith('pr-7');
  });
});

describe('configured, preview missing', () => {
  it('logs the error, shows it in the tab, and never throws', () => {
    const { configure, startDevtools, SupportTab, PREVIEW_NOT_INSTALLED } = load('missing');
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const support = configure(CONFIG);
    expect(support).toMatchObject({ id: 'preview', error: PREVIEW_NOT_INSTALLED });
    expect(support.Provider).toBeUndefined();
    // The CLI lists the topic as off with this error, and the prompt gets nothing.
    expect(support.topic).toBeUndefined();
    expect(support.context).toBeUndefined();

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
