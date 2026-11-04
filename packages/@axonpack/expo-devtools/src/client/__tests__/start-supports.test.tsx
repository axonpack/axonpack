import type { ReactElement, ReactNode } from 'react';

import { resetDevtoolsStart, startDevtools, supportTwice } from '../start-devtools.client';
import { SupportTab } from '../../core/components/devtools-overlay/support-tab.component';
import { DevtoolsProvider } from '../../core/components/devtools-provider.component';
import { supportsStore, type DevtoolsSupport } from '../../core/stores/supports.store';
import { SupportPanel } from '../../devtools-remote-tab/components/support-panel.component';

jest.mock('../../features/crash/services/native-crash.service', () => ({
  persistCrashRecord: () => {},
  isNativeCrashCaptureAvailable: () => false,
  installNativeCrashHandler: () => {},
  drainNativeCrashRecords: () => [],
  readNativeDeviceInfo: () => ({}),
}));
// The panel pulls in a WebView, which has no native module here, and none of it is drawn.
jest.mock('../../core/components/devtools-overlay/devtools-overlay.component', () => ({
  DevtoolsOverlay: () => null,
}));
// The icon font pulls in expo-asset, which jest can't resolve, and no icon is drawn here.
jest.mock('@expo/vector-icons/MaterialIcons', () => () => null);
// No renderer here: the components are called as functions, so their styles can't be a hook.
jest.mock('../../core/utils/themed-styles.util', () => ({
  ...jest.requireActual('../../core/utils/themed-styles.util'),
  makeThemedStyles: () => () => ({}),
}));

const Provider = ({ children }: { children?: ReactNode }) => <>{children}</>;
const Tab = () => null;
const Panel = () => null;
const WORKING: DevtoolsSupport = {
  id: 'extra',
  title: 'Extra',
  icon: 'rule',
  Provider,
  Tab,
  Panel,
};
const BROKEN: DevtoolsSupport = {
  id: 'extra',
  title: 'Extra',
  icon: 'rule',
  error: 'Not installed.',
};
const NO_NETWORK_PATCHES = { http: false };

beforeEach(() => {
  resetDevtoolsStart();
  supportsStore.setSupports([]);
});

describe('config.supports', () => {
  it('keeps the supports for the panel and the DevTools tab', () => {
    startDevtools({ network: NO_NETWORK_PATCHES, supports: [WORKING] });
    expect(supportsStore.getSupports()).toEqual([WORKING]);
  });

  it("puts a support's provider around the app with the devtools off too", () => {
    const tree = DevtoolsProvider({
      config: { enabled: false, supports: [WORKING] },
      children: 'app',
    }) as ReactElement;
    expect(tree.type).toBe(Provider);
  });

  it("logs a support's error with console.error, and never throws", () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => startDevtools({ network: NO_NETWORK_PATCHES, supports: [BROKEN] })).not.toThrow();
    expect(error).toHaveBeenCalledWith('Not installed.');
    error.mockRestore();
  });

  it('keeps the first of two supports with one id, and logs the other', () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const OTHER = { ...WORKING, title: 'Extra v1' };
    startDevtools({ network: NO_NETWORK_PATCHES, supports: [WORKING, OTHER] });
    expect(supportsStore.getSupports()).toEqual([WORKING]);
    expect(error).toHaveBeenCalledWith(supportTwice('Extra v1'));
    error.mockRestore();
  });

  it('shows the error in the tab and the DevTools panel instead of their content', () => {
    expect(
      (SupportTab({ support: BROKEN }) as ReactElement<{ children: string }>).props.children
    ).toBe('Not installed.');
    expect(
      (SupportPanel({ support: BROKEN }) as ReactElement<{ children: string }>).props.children
    ).toBe('Not installed.');
  });

  it("wraps the DevTools panel in the support's provider, since that tab is its own root", () => {
    const panel = SupportPanel({ support: WORKING }) as ReactElement<{ children: ReactElement }>;
    expect(panel.type).toBe(Provider);
    expect(panel.props.children.type).toBe(Panel);
    expect((SupportTab({ support: WORKING }) as ReactElement).type).toBe(Tab);
  });
});
